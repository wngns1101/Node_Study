const express = require('express')

const app = express()
const { MongoClient, ObjectId } = require('mongodb')
const methodOverride = require('method-override')


let db
const url = 'mongodb+srv://root:wkrwjs4602!@cluster0.k2yfl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('forum')
  app.listen(8080, () => {
    console.log('http://localhost:8080에서 서버 실행중')
})
}).catch((err)=>{
  console.log(err)
})

app.use(methodOverride('_method')) 
app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.get('/', (요청, 응답) => {
    응답.sendFile(__dirname + "/index.html")
})

app.get('/news', (요청, 응답) => {
    db.collection('post').insertOne({title: '어쩌구'})
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
            await db.collection('post').insertOne({title: req.body.title, content: req.body.content})
    
            res.redirect('/list')
        }
    } catch(e) {
        console.log(e)
        res.status(500).send('서버에 오류가 발생했습니다.')
    }
})

app.get('/detail/:id', async (req, res) => {
    try{
        let data = await db.collection('post').findOne({_id: new ObjectId(req.params.id)})

        if (data == null) {
            res.status(404).send('유효하지 않는 url 입니다')       
        }

        res.render('detail.ejs', {data: data})
    } catch(e) {
        res.status(404).send('유효하지 않는 url 입니다')   
    }
})

app.get('/modify/:id', async (req, res) => {

    try{
        let data = await db.collection('post').findOne({_id: new ObjectId(req.params.id)})

        if (data == null) {
            res.status(404).send('유효하지 않는 url 입니다')       
        }

        res.render('modify.ejs', {data : data})
    } catch(e) {
        res.status(404).send('유효하지 않는 url 입니다')   
    }
})

app.put('/modify', async (req, res) => {
    console.log(req.body)

        await db.collection('post').updateOne({_id: 1}, {$inc: {like : -2}})

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

    res.render('time.ejs', {currentTime: time})
})

