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

// make a data file for the given post
mkDataFile = function (post) {

    let dir_data = path.join(hexo.base_dir, 'source', '_data'),
    fileName = 'lexter-' + post.slug + '.json',
    dir = path.join(dir_data, fileName),

    $ = cheerio.load(post.content),

    data = {};

    data.tokens_p = tokenizer.tokenize($('p').text());
    data.wc = data.tokens_p.length;

    let json = JSON.stringify(data);

    // start by ensuring the _data folder in source
    return fs.ensureDir(dir_data).then(function () {

        // write data file
        return fs.writeFile(dir, json, 'utf-8');

    }).then(function (json) {

        console.log('success with: ' + fileName);

    }).catch (function (e) {

        console.log(e.message);

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

hexo.extend.generator.register('report', function (locals) {

    // site wide data
    let site = {};

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

    // update site object on a per post basis
    // and create a posts object that will be returned
    // to create paths on a for post basis
    let posts = locals.posts.map(function (post) {

            mkDataFile(post);

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

    return _.concat(posts, {

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
