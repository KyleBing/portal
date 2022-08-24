const { exec } = require('child_process')
const configProject = require('../config/configProject')


// 给管理员发送邮件
function sendEmailToAdmin(title, content){
    exec(` echo "${content}" | mail -s ${title} ${configProject.adminCount}`,(err, stdout, stderr) => {
        if (err){
            console.log('send email fail')
        }
        console.log(stdout)
        console.log(stderr)
    })
}

module.exports = {
    sendEmailToAdmin
}

