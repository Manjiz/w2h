var fs = require('fs'),
    JSFtp = require('jsftp')
    gui = require('nw.gui'),
    async = require('async'),
    svnClient = require('svn-spawn'),
    pseudoContent = document.querySelector('#pseudo-content');

// var menubar = new gui.Menu( {type: 'menubar'} );
// var sub1 = new gui.Menu();
// sub1.append(new gui.MenuItem({
//     label: '关于',
//     click: function() {

//     }
// }))
// menubar.append(new gui.MenuItem( {label: '帮助', submenu: sub1} ));
// gui.Window.get().menu = menubar;
// gui.Window.get().on('close', function() {
//     this.hide(); // Pretend to be closed already
//     // ...
//     this.close(true);
// });

var config = {
    placeholder: '##content##',
    tplDir: 'tpl.html',
    projName: 'w2h-proj'
}

/**
 * 保存文件
 * @param {} 
 *      projName, saveDir, title, imgDir, tplDir
 */
function saveFiles( obj ) {
    var i,
        projName = obj.projName || config.projName,
        saveDir = obj.saveDir, // 保存目录
        title = obj.title || '',  // 文档标题
        imgDir = obj.imgDir || 'images', // 图片目录名
        tpl,    // 模板内容
        postFix,    // 图片后缀
        randomName, // 图片随机名
        tmpImgs;

    // 读取模板
    tpl = fs.readFileSync(obj.tplDir || config.tplDir, {encoding : 'utf-8'});
    console.log(obj.tplDir , config.tplDir);
    if(tpl.indexOf(config.placeholder)<0) {
        console.log(tpl)
        tpl = fs.readFileSync(config.tplDir, {encoding : 'utf-8'});
        console.log(tpl)
    }
    // 新建目录
    if(!fs.existsSync(saveDir)) { fs.mkdirSync(saveDir); }
    // 新建目录
    if(!fs.existsSync(saveDir+'/'+projName)) { fs.mkdirSync(saveDir+'/'+projName); }
    saveDir = saveDir+'/'+projName;
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
    fs.writeFileSync(saveDir+'/index.html', tpl);
}

// 选择模板
document.querySelector('#selectTpl').addEventListener('change', function(evt) {
    $('.dir-show-selectTpl').text(this.value);
})

// 另存为
document.querySelector('#saveas').addEventListener("change", function (evt) {
	saveFiles( {
        tplDir: $('#selectTpl').val(),
        projName: $('#proj-name').val().replace(/\s/g, ''),
        saveDir: this.value,
        title: $('#title').val(),
        imgDir: $('#imgdir').val().replace(/[^a-zA-Z]/g, '') 
    });
    // 为下次存储准备
    this.value='';
}, false);

$('#ftpupload').on('click', function() {
    var projName = $('#proj-name').val().replace(/\s/g, '') || config.projName;
    rmdirSync('locales');   // 整个目录移除
    saveFiles( {
        tplDir: $('#selectTpl').val(),
        projName: projName,
        saveDir: 'locales',
        title: $('#title').val(),
        imgDir: $('#imgdir').val().replace(/[^a-zA-Z]/g, '') 
    })
    ftpUpload('locales' + '/' + projName, '/newforward/static');
})

/**
 * FTP上传
 * @param sourceDir 项目文件夹Path
 * @param targetDir FTP端存放目录
 *
 */
function ftpUpload( sourceDir, targetDir ) {
    var Ftp = new JSFtp({})
    Ftp.raw.mkd(targetDir + '/' + sourceDir.match(/\/?([^\/]*)$/)[1], function(err, data) {
        // if (err) throw err;
        Ftp.destroy();
        Ftp.raw.quit(function(err, data) { if (err) throw err;console.log("Bye!"); });
        targetDir = targetDir + '/' + sourceDir.match(/\/?([^\/]*)$/)[1]
        walk(sourceDir, targetDir);
        function walk(sourceDir, targetDir) {
            var dirList = fs.readdirSync(sourceDir);
            async.eachLimit(dirList, 1, function(item, cb) {
                var Ftp = new JSFtp({})
                if(fs.statSync(sourceDir + '/' + item).isDirectory()){
                    Ftp.raw.mkd(targetDir + '/' + item, function(err, data) {
                        Ftp.destroy();
                        Ftp.raw.quit(function(err, data) {if (err) throw err;console.log("dir Bye!");});
                        walk(sourceDir + '/' + item, targetDir + '/' + item);
                        cb();
                    });
                }else{
                    Ftp.put(sourceDir + '/' + item, targetDir +'/' + item, function(err) {
                        if (err) throw err;
                        Ftp.destroy();
                        Ftp.raw.quit(function(err, data) {if (err) throw err;console.log(item, "file Bye!");});
                        cb();
                    });
                }
            })
        }
    });
}

svnUpload();

/**
 * SVN上传
 *
 */
function svnUpload() {
    var svn = new svnClient({

    })

    svn.checkout("", function(err, data) {
        console.log(data)
    });

    svn.update(function(err, data) {
        console.log('updated');
    });
}

// 删除非空目录
var rmdirSync = (function(){
    function iterator(url,dirs){
        var stat = fs.statSync(url);
        if(stat.isDirectory()){
            dirs.unshift(url);//收集目录
            inner(url,dirs);
        }else if(stat.isFile()){
            fs.unlinkSync(url);//直接删除文件
        }
    }
    function inner(path,dirs){
        var arr = fs.readdirSync(path);
        for(var i = 0, el ; el = arr[i++];){
            iterator(path+"/"+el,dirs);
        }
    }
    return function(dir,cb){
        cb = cb || function(){};
        var dirs = [];

        try{
            iterator(dir,dirs);
            for(var i = 0, el ; el = dirs[i++];){
                fs.rmdirSync(el);//一次性删除所有收集到的目录
            }
            cb()
        }catch(e){//如果文件或目录本来就不存在，fs.statSync会报错，不过我们还是当成没有异常发生
            e.code === "ENOENT" ? cb() : cb(e);
        }
    }
})();