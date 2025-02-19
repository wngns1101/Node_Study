const express = require('express')

const app = express()
const { MongoClient, ObjectId } = require('mongodb')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')

let db
const url = 'mongodb+srv://root:wkrwjs4602!@cluster0.k2yfl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
new MongoClient(url).connect().then((client) => {
    console.log('DB연결성공')
    db = client.db('forum')
    app.listen(8080, () => {
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
    cookie : {maxAge: 60 * 60 * 1000},
    store : MongoStore.create({
        mongoUrl : 'mongodb+srv://root:wkrwjs4602!@cluster0.k2yfl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
        dbName : 'forum'
    })
}))

app.use(passport.session())

app.get('/', (요청, 응답) => {
    응답.sendFile(__dirname + "/index.html")
})

app.get('/news', (요청, 응답) => {
    db.collection('post').insertOne({ title: '어쩌구' })
    응답.send('데이터~~')
})

app.get('/shop', (요청, 응답) => {
    응답.send('쇼핑페이지임')
})

app.get('/list', async (요청, 응답) => {
    let result = await db.collection('post').find().toArray()
    console.log(result)
    console.log(result[0].title)

    // 템플릿 파일 내릴 때는 render 써야함
    // ejs는 기본 경로가 /views/*
    응답.render('list.ejs', { posts: result })
})

app.get('/write', (요청, 응답) => {
    응답.render('write.ejs')
})

app.post('/add', async (req, res) => {
    console.log(req.body)

    try {
        if (req.body.title == '' || req.body.content == '') {
            res.send('제목이 비었습니다.')
        } else {
            await db.collection('post').insertOne({ title: req.body.title, content: req.body.content })

            res.redirect('/list')
        }
    } catch (e) {
        console.log(e)
        res.status(500).send('서버에 오류가 발생했습니다.')
    }
})

app.get('/detail/:id', async (req, res) => {
    try {
        let data = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) })

        if (data == null) {
            res.status(404).send('유효하지 않는 url 입니다')
        }

        res.render('detail.ejs', { data: data })
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

    await db.collection('post').updateOne({ _id: 1 }, { $inc: { like: -2 } })

    // try{
    //     if (req.body.id == '' || req.body.title == '' || req.body.connect == '') {
    //         res.status(400).send('빈칸이 존재합니다.')
    //     }

    //     await db.collection('post').updateOne({_id: new ObjectId(req.body.id)}, {$set: {title: req.body.title, content: req.body.content}})
    //     res.redirect('/list')
    // } catch(e) {
    //     res.status(500).send('서버 오류입니다.')
    // }
})


app.get('/time', (req, res) => {
    let time = new Date()

    res.render('time.ejs', { currentTime: time })
})

app.delete('/doc', async (req, res) => {
    console.log(req.body.id)

    await db.collection('post').deleteOne({ _id: new ObjectId(req.body.id) })
    res.send('삭제 완료')
})

app.get('/list/:id', async (req, res) => {
    let result = await db.collection('post').find().skip((req.params.id - 1) * 5).limit(5).toArray()
    res.render('list.ejs', { posts: result })
})

app.get('/list/next/:id', async (req, res) => {
    console.log(req.params.id)
    let result = await db.collection('post').find({ _id: { $gt: new ObjectId(req.params.id) } }).limit(5).toArray()
    res.render('list.ejs', { posts: result })
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

passport.deserializeUser( async (user, done) => {
    let result = await db.collection('user').findOne({_id: new ObjectId(user.id)})

    delete result.password

    process.nextTick(() => {
      return done(null, result)
    })
  })

app.get('/login', async (req, res) => {
    console.log(req.user)
    res.render('login.ejs')
})

app.post('/login', async (req, res, next) => {
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

    res.render('myPage.ejs', {id: req.user._id})
})

app.get('/register', (req, res) => {
    res.render('register.ejs')
})

app.post('/register', async (req, res) => {
    let hashPassword = await bcrypt.hash(req.body.password, 10)
    let result = await db.collection('user').insertOne({username: req.body.username, password: hashPassword})
    res.redirect('/')
})