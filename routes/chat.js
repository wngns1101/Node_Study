const router = require('express').Router()
const {ObjectId} = require('mongodb')
const connectDB = require('../database')

let db
connectDB.then((client) => {
    db = client.db('forum')
}).catch((err) => {
    console.log(err)
})

router.get('/chat', checkLogin, async (req, res) => {
    // let chatrooms = await db.collection('chatroom').find({$or: [{"member.0": req.user._id}, {"member.1": req.user._id}]}).toArray()
    let chatrooms = await db.collection('chatroom').find({
        member: req.user._id
    }).toArray()

    res.render('chatList.ejs', {chats: chatrooms})
})


router.post('/chat', checkLogin, async (req, res) => {
    await db.collection('chatroom').insertOne({member: [req.user._id, new ObjectId(req.body.writerId)]})

    res.redirect('/chat')
})

router.get('/chat/detail/:id', checkLogin, async (req, res) => {
    let result = await db.collection('chatroom').findOne({_id : new ObjectId(req.params.id)})
    res.render('chatDetail.ejs', {data: result})
})

function checkLogin(req, res, next) {
    if (!req.user) {
        res.send('로그인하세요')
    }

    next()
}

module.exports = router