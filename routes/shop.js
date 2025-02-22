const router = require('express').Router()

const connectDB = require('../database')

let db
connectDB.then((client) => {
    db = client.db('forum')
}).catch((err) => {
    console.log(err)
})

router.get('/shirts', async (req, res) => {
    await db.collection('post').find().toArray();
    res.send('셔츠파는 페이지임')
})

router.get('/pants', (req, res) => {
    res.send('바지파는 페이지임')
})

module.exports = router