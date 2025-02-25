const express = require('express')

const app = express()
const { MongoClient, ObjectId } = require('mongodb')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')
require('dotenv').config()
const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const connectDB = require('./database.js')
const { createServer } = require('http')
const { Server } = require('socket.io')
const server = createServer(app)
const io = new Server(server) 

const s3 = new S3Client({
    region: 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY
    }
})

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        key: function (요청, file, cb) {
            cb(null, Date.now().toString()) //업로드시 파일명 변경가능
        }
    })
})

let db
let changeStream

connectDB.then((client) => {
    console.log('DB연결성공')
    db = client.db('forum')
    let condition = [
        {$match : {operationType : 'insert'}}
    ]

    changeStream = db.collection('post').watch(condition)

    server.listen(process.env.PORT, () => {
        console.log('http://localhost:8080에서 서버 실행중')
    })
}).catch((err) => {
    console.log(err)
})

app.use(methodOverride('_method'))
app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(passport.initialize())
app.use(session({
    secret: 'oefjdasdf',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
    store: MongoStore.create({
        mongoUrl: process.env.DB_URL,
        dbName: 'forum'
    })
}))

app.use(passport.session())

// app.use(checkUser) <- 밑에 있는 api는 이 미들웨어 다 등록해준다.
// app.use('/url', checkUser) <- 해당되는 url에 미들웨어 다 등록해준다.
// app.get('/', [checkUser1, checkUser2], (요청, 응답) => {
app.get('/', checkUser, (요청, 응답) => {
    응답.sendFile(__dirname + "/index.html")
})

app.get('/news', (요청, 응답) => {
    db.collection('post').insertOne({ title: '어쩌구' })
    응답.send('데이터~~')
})

app.get('/shop', (요청, 응답) => {
    응답.send('쇼핑페이지임')
})

app.use('/list', currentTime)
app.get('/list', async (요청, 응답) => {
    let result = await db.collection('post').find().toArray()
    console.log(result)
    console.log(result[0].title)
    // 템플릿 파일 내릴 때는 render 써야함
    // ejs는 기본 경로가 /views/*
    응답.render('list.ejs', { posts: result, user: 요청.user._id })
})

app.get('/write', (요청, 응답) => {
    응답.render('write.ejs')
})

app.post('/add', async (req, res) => {
    console.log(req.body)

    upload.single('img1')(req, res, (err) => {
        if (err) return res.send('업로드 에러')

        try {
            if (req.body.title == '') {
                res.send('제목이 비었습니다.')
            } else {
                db.collection('post').insertOne({
                    title: req.body.title,
                    content: req.body.content,
                    img: req.file ? req.file.location : '',
                    user: req.user._id,
                    username: req.user.username
                })

                res.redirect('/list')
            }
        } catch (e) {
            console.log(e)
            res.status(500).send('서버에 오류가 발생했습니다.')
        }
    })
})

app.get('/detail/:id', async (req, res) => {
    try {
        let data = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) })
        let comments = await db.collection('comment').find({parent_id: new ObjectId(req.params.id)}).toArray()

        if (data == null) {
            res.status(404).send('유효하지 않는 url 입니다')
        }

        res.render('detail.ejs', { data: data, comments: comments})
    } catch (e) {
        res.status(404).send('유효하지 않는 url 입니다')
    }
})

app.get('/modify/:id', async (req, res) => {

    try {
        let data = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) })

        if (data == null) {
            res.status(404).send('유효하지 않는 url 입니다')
        }

        res.render('modify.ejs', { data: data })
    } catch (e) {
        res.status(404).send('유효하지 않는 url 입니다')
    }
})

app.put('/modify', async (req, res) => {
    console.log(req.body)

    // await db.collection('post').updateOne({ _id: 1, user: new ObjectId(req.user._id) }, { $inc: { like: -2 } })

    try{
        if (req.body.id == '' || req.body.title == '' || req.body.connect == '') {
            res.status(400).send('빈칸이 존재합니다.')
        }

        await db.collection('post').updateOne({_id: new ObjectId(req.body.id), user: new ObjectId(req.user._id)}, {$set: {title: req.body.title, content: req.body.content}})
        res.redirect('/list')
    } catch(e) {
        res.status(500).send('서버 오류입니다.')
    }
})


app.get('/time', (req, res) => {
    let time = new Date()

    res.render('time.ejs', { currentTime: time })
})

app.delete('/doc', async (req, res) => {
    console.log(req.body.id)

    await db.collection('post').deleteOne({
        _id: new ObjectId(req.body.id),
        user: new ObjectId(req.user._id)
    })
    res.send('삭제 완료')
})

app.get('/list/:id', async (req, res) => {
    let result = await db.collection('post').find().skip((req.params.id - 1) * 5).limit(5).toArray()
    res.render('list.ejs', { posts: result, user: req.user._id })
})

app.get('/list/next/:id', async (req, res) => {
    console.log(req.params.id)
    let result = await db.collection('post').find({ _id: { $gt: new ObjectId(req.params.id) } }).limit(5).toArray()
    res.render('list.ejs', { posts: result, user: req.user._id })
})

passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db.collection('user').findOne({ username: 입력한아이디 })
    if (!result) {
        return cb(null, false, { message: '아이디 DB에 없음' })
    }

    console.log(입력한비번)
    console.log(result.password)

    if (await bcrypt.compare(입력한비번, result.password)) {
        return cb(null, result)
    } else {
        return cb(null, false, { message: '비번불일치' });
    }
}))

passport.serializeUser((user, done) => {
    process.nextTick(() => {
        done(null, { id: user._id, username: user.username })
    })
})

passport.deserializeUser(async (user, done) => {
    let result = await db.collection('user').findOne({ _id: new ObjectId(user.id) })

    delete result.password

    process.nextTick(() => {
        return done(null, result)
    })
})

app.get('/login', async (req, res) => {
    console.log(req.user)
    res.render('login.ejs')
})

app.post('/login', checkBlank, async (req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
        if (error) return res.status(500).json(error)
        if (!user) return res.status(401).json(info.message)
        req.logIn(user, (err) => {
            res.redirect('/')
        })
    })(req, res, next)
})

app.get('/myPage', (req, res) => {
    if (!req.user) {
        res.sendStatus(400).send('로그인 하지 않았습니다.')
    }

    res.render('myPage.ejs', { id: req.user._id })
})

app.get('/register', (req, res) => {
    res.render('register.ejs')
})

app.post('/register', checkBlank, async (req, res) => {
    let hashPassword = await bcrypt.hash(req.body.password, 10)
    let result = await db.collection('user').insertOne({ username: req.body.username, password: hashPassword })
    res.redirect('/')
})

app.get('/search', async (req, res) => {
    // let result = await db.collection('post').find({title : {$regex : req.query.val}}).toArray()
    // 정규식 

    // 성능평가
    // let result = await db.collection('post').find({$text: {$search : req.query.val}}).explain('executionStats')

    // 인덱스 조회 (단 띄어쓰기 기준으로 검색 가능해서 문자 인덱스에는 사용 안 함)
    // let result = await db.collection('post').find({$text: {$search : req.query.val}}).toArray()

    let searchCondition = [
        {
            $search: {
                index: 'title_index',
                text: { query: req.query.val, path: 'title' }
            }
        },
        { $project: { title: 1 } }
        // {$skip : 10}
    ]
    let result = await db.collection('post').aggregate(searchCondition).toArray()

    res.render('search.ejs', { posts: result })
})

app.post('/comment', (req, res) => {
    try{
        if (req.comment = '') {
            res.status(400).send('내용이 비었습니다.')
        }

        db.collection('comment').insertOne({
            comment: req.body.content,
            parent_id: new ObjectId(req.body.parentId)
        })

        res.redirect('/detail/' + req.body.parentId)
    } catch (e) {
        res.status(500).send('서버 오류입니다')
    }
})

app.get('/stream/list', (req, res) => {
    res.writeHead(200, {
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });
    
    res.write('event: msg\n');
    res.write('data: 바보\n\n');

    changeStream.on('change', (result) => {
        res.write('event: msg\n');
        res.write(`data: ${JSON.stringify(result.fullDocument)}\n\n`);
        })
})

app.use('/shop', require('./routes/shop.js'))
app.use('/board/sub', require('./routes/board.js'))
app.use('/', require('./routes/chat.js'))

function checkUser(req, res, next) {
    if (!req.user) {
        res.send('로그인하세요')
    }
    // 다음으로 이동하라는 뜻 없다면 무한대기 상태에 빠진다.
    next()
}

function currentTime(req, res, next) {
    console.log(new Date())
    next()
}

function checkBlank(req, res, next) {
    if (req.body.username == '' || req.body.password == '') {
        res.send('아이디 또는 비번이 빈칸입니다.')
    }

    next()
}

io.on('connection', (socket) => {
    console.log('누가 연결함')

    socket.on('ask-join', (data) => {
        console.log(socket.request.session)

        console.log(data)
        socket.join(data)
    })

    socket.on('message', (data) => {
        io.to(data.room).emit('broadcast', data.msg)
    })  
})