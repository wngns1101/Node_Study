let router = require('express').Router()

router.get('/sports', checkLogin, (요청, 응답) => {
    응답.send('스포츠 게시판')
})
router.get('/game', checkLogin, (요청, 응답) => {
    응답.send('게임 게시판')
})

function checkLogin(req, res, next) {
    if (!req.user) {
        res.send('로그인하세요')
    }

    next()
}

module.exports = router