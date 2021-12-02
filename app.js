const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const a4_page_height = 842; // pt

/** Helper method to check string is valid url */
const validate_url = (string) => {
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
}

/** Helper method to check is integer */
const isInteger = (value) => {
    return /^\d+$/.test(value);
}

/**
 * Validate query param export pdf download
 * @param {Object} query 
 * @returns 
 */
const validatePdfQuery = (query) => {
    if (!query.url) {
        throw Error("Web page url is required");
    }
    if (!validate_url(query.url)) {
        throw Error("!Invalid page url");
    }
    let one_page = true,
        width = parseInt(query.w),
        height = parseInt(query.h),
        filename = query.name;
    if (query.onepage && (query.onepage === 'false' || query.onepage === false)) {
        one_page = false;
    }
    query.one_page = one_page;
    if (isInteger(width)) {
        query.width = width;
    }
    if (isInteger(height)) {
        query.height = query.h;
        query.one_page = false;
    }
    if (filename) {
        query.filename = filename;
    }
    return query;
}

// Pdf route
app.get("/pdf/:action?", async (req, res, next) => {
    let query = req.query;
    let action = req.params.action;
    try {
        let { url, one_page, width, height, filename } = validatePdfQuery(query);
        filename = filename ? filename : "attachment";
        const options = { printBackground: true };
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.goto(url, {
            waitUntil: 'networkidle2',
        });
        console.log(one_page);
        // If one page calcuate we page height
        if (one_page) {
            let calculate_height = await page.evaluate(() => document.documentElement.offsetHeight);
            let pages = Math.ceil(calculate_height / a4_page_height);
            console.log("Calculate Height", calculate_height);
            console.log("Pages", pages);
            height = a4_page_height * pages;
        }
        // Set pdf width option
        if (width) {
            options.width = width;
        }
        // Set height when exists
        if (height) {
            options.height = height;
            console.log("Final height", height);
        }
        let pdf = await page.pdf(options);
        await browser.close();
        res.contentType('application/pdf');
        if (action !== 'download') {
            return res.send(pdf);
        }
        // Download file
        res.writeHead(200, {
            'Content-disposition': 'attachment; filename=' + filename + '.pdf'
        });
        res.write(pdf);
        res.end();
    } catch (error) {
        next(error);
    }
})

app.get('/', (req, res, next) => {
    res.send("<h1>Hello World</h1>")
})

app.use((err, req, res, next) => {
    res.status(400).json({
        error: err.message
    })
})

const PORT = process.env.PORT || 3600;
app.listen(PORT, () => console.log("Server listing on port " + PORT));