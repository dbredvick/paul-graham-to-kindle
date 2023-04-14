const axios = require('axios');
const cheerio = require('cheerio');
const { spawn } = require('child_process');
const fs = require('fs');
const TurndownService = require('turndown');

const turndownService = new TurndownService();

const essaysListUrl = 'http://www.paulgraham.com/articles.html';

async function main() {
    try {
        const essays = await getEssayLinks();
        essays.reverse();
        const essayTexts = await Promise.all(essays.map((essay) => getEssayText(essay)));

        const combinedText = essayTexts.join('\n\n');
        console.log('Combined text:', combinedText);
        fs.writeFileSync('paul_graham_essays.txt', combinedText);

        const outputFile = 'paul_graham_essays.epub';
        await generateEpub('paul_graham_essays.txt', outputFile);
        console.log(`EPUB file generated: ${outputFile}`);
    } catch (error) {
        console.error('Error:', error);
    }
}

function generateEpub(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        const pandoc = spawn('pandoc', [
            inputFile,
            '-o',
            outputFile,
            '--toc',
            '--toc-depth=1',
            '--metadata',
            'title="Paul Graham Essays"'
        ]);

        pandoc.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        pandoc.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        pandoc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`pandoc exited with code ${code}`));
            }
        });
    });
}
const baseUrl = 'http://www.paulgraham.com/';

async function getEssayLinks() {
    const response = await axios.get(essaysListUrl);
    const $ = cheerio.load(response.data);

    const links = [];

    $('a').each((_, link) => {
        const url = $(link).attr('href');
        if (url && url.endsWith('.html')) {
            links.push(baseUrl + url);
        }
    });

    return links;
}

async function getEssayText(url) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        $('script').remove();
        $('img').remove();

        const title = $('title').text();
        const htmlContent = $('body').html();
        const markdownContent = turndownService.turndown(htmlContent);

        return `\n\n# ${title}\n\n${markdownContent}`;
    } catch (error) {
        console.error(`Error fetching essay: ${url}\n${error}`);
        return '';
    }
}

main().then(() => {
    const outputFile = 'paul_graham_essays.epub';
    generateEpub('paul_graham_essays.txt', outputFile, (error) => {
        if (error) {
            console.error('Error generating EPUB file:', error);
            return;
        }
        console.log(`EPUB file generated: ${outputFile}`);
    });
});