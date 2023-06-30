const utility = require("../../config/utility");
utility
    .getDataFromDB('diary', [`select * from users`])
    .then(data => {
        let sqlArray = []
        data.forEach(user => {
            sqlArray.push(`update users set count_diary = (SELECT count(*) from diaries where uid = ${user.uid}) where uid = ${user.uid};`)
            sqlArray.push(`update users set count_map_route = (SELECT count(*) from map_route where uid = ${user.uid}) where uid = ${user.uid};`)
            sqlArray.push(`update users set count_dict  = (SELECT count(*) from wubi_dict where uid = ${user.uid}) where uid = ${user.uid};`)
            sqlArray.push(`update users set count_qr    = (SELECT count(*) from qrs where uid = ${user.uid}) where uid = ${user.uid};`)
            sqlArray.push(`update users set count_words = (SELECT count(*) from wubi_words where user_init = ${user.uid}) where uid = ${user.uid};`)
        })
        utility
            .getDataFromDB('diary', sqlArray, true)
            .then(data => {
                console.log(`success: user's count diary|dict has updated`)
            })
            .catch(err => {
                console.log(`error:  user count diary|dict update`)
            })
    })
    .catch(err => {
        console.log('error: get users info')
    })
