var fs = require('fs'),
    gulp = require('gulp'),
    gulp = require('gulp-uglify'),
    JSFtp = require('jsftp')
    gui = require('nw.gui'),
    pseudoContent = document.querySelector('#pseudo-content');

var menubar = new gui.Menu( {type: 'menubar'} );
var sub1 = new gui.Menu();
sub1.append(new gui.MenuItem({
    label: '关于',
    click: function() {

    }
}))
menubar.append(new gui.MenuItem( {label: '帮助', submenu: sub1} ));
gui.Window.get().menu = menubar;

var config = {
    placeholder: '##content##',
    tplDir: 'tpl.html',

    ftpDir: ''
}

function saveFiles( saveDir, title, imgDir ) {
    var i, tpl,
        postFix,
        randomName,
        fragment,
        tmpImgs;

    imgDir = imgDir || 'images';

    // 读取模板
    tpl = fs.readFileSync(config.tplDir, {encoding : 'utf-8'});
    if(tpl.indexOf(config.placeholder)<0) {
        return;
    }
    // 新建目录
    if(!fs.existsSync(saveDir+'/'+imgDir)) { fs.mkdirSync(saveDir+'/'+imgDir); }
    // 保存编辑器内容到伪DOM里（以免修改src时影响显示）
    pseudoContent.innerHTML = document.querySelector('.ke-edit-iframe').contentDocument.body.innerHTML;
    // 逐个<img>写到本地和替换src
    tmpImgs = pseudoContent.querySelectorAll('img');
    for(i=0;i<tmpImgs.length;i++) {
        postFix = tmpImgs[i].src.match(/.*\/\w+(\.\w+)$/)[1];
        randomName = new Date().getTime();
        fs.writeFileSync(saveDir+'/'+imgDir+'/'+randomName+postFix, fs.readFileSync( tmpImgs[i].src.replace('file:///', '') ));
        tmpImgs[i].src = imgDir+'/'+randomName+postFix;
        tmpImgs[i].removeAttribute('data-ke-src');  // clear
    }
    $('.MsoNormal, .MsoListParagraph', pseudoContent).removeAttr('class');  // clear 移除多余信息
    title&&(tpl = tpl.replace(/<title>.*<\/title>/, '<title>'+title+'</title>')); // 设置标题
    // 目标Id，填充内容
    tpl = tpl.replace(config.placeholder, pseudoContent.innerHTML);
    // 写文件
    fs.writeFile(saveDir+'/index.html', tpl, {}, function(err) {
        if(err) throw err;
        console.log('saved!');
    });
}

// 选择模板
document.querySelector('#selectTpl').addEventListener('change', function(evt) {
	config.tplDir = this.value;
    $('.dir-show-selectTpl').text(this.value);
})

// 另存为
document.querySelector('#saveas').addEventListener("change", function (evt) {
	saveFiles( this.value, $('#title').val(), $('#imgdir').val().replace(/[^a-zA-Z]/g, '') );
    // 为下次存储准备
    this.value='';
}, false);

ftpUpload( 'test-ftp-upload', '/newforward/static' );
/**
 * FTP上传
 * @param sourceDir 项目文件夹Path
 * @param targetDir FTP端存放目录
 *
 */
function ftpUpload( sourceDir, targetDir ) {
    var Ftp = new JSFtp({host: '172.25.34.21',user: 'c2c_design_ui',pass: 'c2c_design_ui'})
    Ftp.raw.mkd(targetDir + '/' + sourceDir.match(/\/?([^\/]*)$/)[1], function(err, data) {
        if (err) return console.error(err);
        Ftp.raw.quit(function(err, data) {if (err) return console.error(err);console.log("Bye!");});
        targetDir = targetDir + '/' + sourceDir.match(/\/?([^\/]*)$/)[1]
        walk(sourceDir, targetDir)
        function walk(sourceDir, targetDir) {
            var dirList = fs.readdirSync(sourceDir);
            console.log('list:  ', dirList)
            dirList.forEach(function(item) {
                var Ftp = new JSFtp({host: '172.25.34.21',user: 'c2c_design_ui',pass: 'c2c_design_ui'})
                if(fs.statSync(sourceDir + '/' + item).isDirectory()){
                    Ftp.raw.mkd(targetDir + '/' + item, function(err, data) {
                        if (err) return console.error(err);
                        Ftp.raw.quit(function(err, data) {if (err) return console.error(err);console.log("Bye!");});
                        walk(sourceDir + '/' + item, targetDir + '/' + item);
                    });
                }else{
                    Ftp.put(sourceDir + '/' + item, targetDir +'/' + item, function(hadError) {
                        if (!hadError) {
                            console.log("File transferred successfully!");
                        }
                        Ftp.raw.quit(function(err, data) {if (err) return console.error(err);console.log("Bye!");});
                    });
                }
            })
        }
    });  
}