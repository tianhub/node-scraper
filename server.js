var http = require('http'),
    path = require('path'),
    request = require('request');
fs = require('fs'),
    url = require('url'),
    superagent = require('superagent'),
    async = require('async'),
    cheerio = require("cheerio"),
    eventproxy = require('eventproxy');

let ep = new eventproxy(),
    catchDate = [],	//存放爬取数据
    deleteRepeat = {},	//去重哈希数组
    urlsArray = [], // 存放爬取的网址
    pageUrls = [], // 页码网站
    startDate = new Date(),	//开始时间
    endDate = false,	//结束时间
    pageNum = 13000;	//要爬取个数

for (let i = 1; i <= pageNum; i++) {
    pageUrls.push({ url: 'http://www.zxcs.me/post/' + i, index: i });
}

request(url, function (err, res, body) {
    if (!err && res.statusCode === 200) {
        var $ = cheerio.load(body);
        var imgList = []
        JSON.parse($('script[id="initData"]').html()).list.forEach(function (item) {
            imgList.push(item.img)
        });
        console.log(imgList);
    }
});

function writeTxt(content) {
    fs.appendFile('history.txt', content, function (err) {
        if (err) {
            console.log(err);
            return false;
        }
        console.log('日志写入成功');
    });
}


/**
 *生成多层目录
 * @param dir 多层目录
 * @param split 分隔符，ex:'/' 对应的目录地址:'2015/10/10'
 * @param mode 目录权限（读写权限），默认0777
 * @param callback
 */
let createDirsSync = function (dir, callback) {
    console.log("创建目录：" + dir);
    if (!fs.existsSync(dir)) {
        var dirArr = dir.split('/');
        var pathtmp;
        async.forEach(dirArr, function (item, cb) {
            console.log(item);
            if (pathtmp) {
                pathtmp = path.join(pathtmp, item);
            }
            else {
                pathtmp = item;
            }
            if (!fs.existsSync(pathtmp)) {
                if (!fs.mkdirSync(pathtmp)) {
                    cb(null, item);
                }
                else {
                }
            }
        }, function (err) {
            //callback(err);
        })
        callback();
    }
    else {
        callback();
    }
}


//主程序

function main() {
    var curCount = 0;
    var reptileMove = function (item, callback) {
        //延迟毫秒数
        var delay = parseInt((Math.random() * 30000000) % 1000, 10) * 4;
        curCount++;
        console.log('现在的并发数是', curCount, '，正在抓取的是', item.url, '，耗时' + delay + '毫秒');

        superagent.get(item.url).end(function (err, pres) {
            // pres.text 里面存储着请求返回的 html 内容，将它传给 cheerio.load 之后
            // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
            // 剩下就都是利用$ 使用 jquery 的语法了
            if (err || !pres.text || !pres.text || pres.text.indexOf('404，您请求的文件不存在!') !== -1 || pres.text.indexOf('关于【校对版】与【精校版】的区别') !== -1) {
                console.log(`序号${item.index}页面不存在！`);
                writeTxt(`序号${item.index}页面不存在,已跳过\n`);
                return;
            }
            let $ = cheerio.load(pres.text);
            let bookName = $('#content h1').text().trim();
            let bookType1 = $('#ptop a').eq(1).text();
            let bookType2 = $('#ptop a').eq(2).text();
            console.log(bookName);
            console.log(bookType1);
            console.log(bookType2);
            let downloadPageUrl = 'http://www.zxcs.me/download.php?id=' + item.index;
            superagent.get(downloadPageUrl).end(function (err, pres) {
                if(!pres || !pres.text) {
                    return false;
                    writeTxt(`小说名-->${bookName} 索引-->${bookIndex} 无法下载\n`);
                }
                let $$ = cheerio.load(pres.text);
                let downloadEnd = $$('.downfile a').attr('href') && $$('.downfile a').attr('href').trim();
                downloadEnd = encodeURI(downloadEnd);
                console.log(downloadEnd);
                let downloadBook = function (src, dest, bookName = '', bookIndex = 1) {
                    writeTxt(`小说名-->${bookName} 索引-->${bookIndex} 正在下载\n`);
                    var ws = fs.createWriteStream(dest)
                    request(src).pipe(ws).on('close', function () {
                        console.log(`小说名-->${bookName} 索引-->${bookIndex} 已保存在-->${dest}下！`);
                        writeTxt(`小说名-->${bookName} 索引-->${bookIndex} 已保存在-->${dest}下！\n`);
                        ws.close();
                    })
                }
                //判断目录是否存在
                const bookDir = `./books/${bookType1}/${bookType2}`;
                createDirsSync(bookDir, function () {
                    try{
                        downloadBook(downloadEnd, `${bookDir}/${bookName}.rar`, bookName, item.index);
                    }catch {
                        
                    }
                });
            });
        });

        setTimeout(function () {
            curCount--;
            callback(null, url + 'Call back content');
        }, delay);
    };


    // 使用async控制异步抓取 	
    // mapLimit(arr, limit, iterator, [callback])
    // 异步回调
    async.mapLimit(pageUrls, 2, function (item, callback) {
        reptileMove(item, callback);
    }, function (err, result) {
        if (err) {
            console.log(err);
            return false;
        }
        console.log(result);
    });
}

exports.run = main;