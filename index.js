/*

generate a report on posts

 */

// should come with hexo
let cheerio = require('cheerio'),
_ = require('lodash'),
path = require('path'),

// added with hexo-lexter package.json
fs = require('fs-extra'),
natural = require('natural'),

tokenizer = new natural.WordTokenizer();

// make a new data object for the given post
let mkData_start = function (post) {

    let $ = cheerio.load(post.content),
    text = $('p').text(),

    data = {};

    data.slug = post.slug;
    data.content = text;
    data.tokens = tokenizer.tokenize(text);
    data.wc = data.tokens.length;
    data.keywords = {};

    // start by ensuring the _data folder in source
    return new Promise(function (resolve, reject) {

        // just resolve with data for now
        resolve(data);

    });

};

let mkData_site_keywords = function (post, data, key) {

    let keywords = key.site;
    data.keywords.site = [];

    keywords.map(function (keyword) {

        let pat = new RegExp(keyword, 'g'),
        ct = 0,
        match = data.content.match(pat);

        if (match) {

            ct = match.length;

            data.keywords.site.push({

                keyword: keyword,
                ct: ct

            });

        }

    });

    return data;

}

let mkDataFile = function (post, key) {

    let dir_data = path.join(hexo.base_dir, 'source', '_data'),
    fileName = 'lexter-' + post.slug + '.json',
    dir = path.join(dir_data, fileName);

    // ensure data path is there
    fs.ensureDir(dir_data).then(function () {

        // make the data object
        return mkData_start(post);

    }).then(function (data) {

        return mkData_site_keywords(post, data, key);

    }).then(function (data) {

        // write out the data object
        let json = JSON.stringify(data);

        console.log('data file for: ' + data.slug);

        // make sure data path is in the source folder
        return fs.writeFile(dir, json, 'utf-8');

    }).catch (function (e) {

        console.log(e.message);

    });

};

// get keywords at /source/lexter_keywords.json if there
let getKeywordsFile = function () {

    return new Promise(function (resolve, reject) {

        let uri = path.join(hexo.source_dir, 'lexter_keywords.json');

        fs.readFile(uri, 'utf-8').then(function (data) {

            try {

                let json = JSON.parse(data);

                resolve(json);

            } catch (e) {

                reject(e);

            }

        }).catch (function (e) {

            reject(e);

        });

    });

};

// tabulate word count for the given content, and element
let tabWC = function (site, content, el) {

    let $ = cheerio.load(content),
    text = $(el).text(),
    //count = text.split(' ').length;

    count = tokenizer.tokenize(text).length;

    if (text.length > 0) {

        site.wordCounts[el] += count;
        site.wordCounts.total += count;

    }

    return count;

};

let genPostObjects = function (locals, site, key) {

    // create objects for each post that are used by the generator
    return locals.posts.map(function (post) {

        mkDataFile(post, key);

        // tabulate site word count totals
        let ct = {
            total: 0
        };
        ct.p = tabWC(site, post.content, 'p');
        ct.total += ct.p

        let h = 1;
        while (h < 7) {
            ct['h' + h] = tabWC(site, post.content, 'h' + h);
            ct.total += ct['h' + h];
            h += 1;
        }

        site.wordCounts.posts.push({

            path: post.path,
            title: post.title,
            ct: ct

        });

        // return object for post
        return {

            path: path.join('reports', post.path),
            data: _.merge({}, locals, {
                data: {
                    report: true,
                    post_path: post.path,
                    site: site,
                    ct: ct

                }
            }),
            layout: ['report_post']

        }

    });

};

hexo.extend.generator.register('lexter_report', function (locals) {

    // site wide data
    let site = {},

    key = {
        site: [],
        posts: []
    };

    // site wide defaults
    site.postCount = locals.posts.length;
    site.wordCounts = {};
    site.wordCounts.total = 0;
    site.wordCounts.p = 0;
    site.wordCounts.h1 = 0;
    site.wordCounts.h2 = 0;
    site.wordCounts.h3 = 0;
    site.wordCounts.h4 = 0;
    site.wordCounts.h5 = 0;
    site.wordCounts.h6 = 0;
    site.wordCounts.posts = [];

    return getKeywordsFile().then(function (result) {

        console.log('keywords!');
        return _.merge({
            site: [],
            posts: []
        }, result);

    }).catch (function (e) {

        console.log('error with lexter_keywords.json file');
        console.log(e);

        return {
            site: [],
            posts: []
        };

    })
        .then(function (key) {

            console.log('key:');
            console.log(key);

            return _.concat(genPostObjects(locals, site, key), {

                path: 'reports/index.html',
                data: _.merge(locals, {}, {
                    data: {
                        report: false,
                        site: site,
                        post_path: true,
                        foo: ''
                    }
                }),
                layout: ['report']

            });

        });

});

// basic info for the given blog post
hexo.extend.helper.register('lexter_basic_info', function (site, post) {

    let data = site.data['lexter-' + post.slug],
    html = '<div><p>Lexter post info: </p>';

    html += '<ul>';

    html += '<li>Word Count: ' + data.wc + '<\/li>'

    html += '<\/ul>';

    return html + '<\/div>';

});
