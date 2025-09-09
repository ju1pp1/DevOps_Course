const express = require('express')
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const http = require('http');

const app = express();
const PORT = 8199;

const STORAGE_URL = process.env.STORAGE_URL || 'http://storage:8080';
const SERVICE2_URL = process.env.SERVICE2_URL || 'http://service2:9090';
const VSTORAGE_FILE = '/vstorage/log.txt';

app.use(express.text({ type: '*/*' }));

function isoUtcNow() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

//Kernel uptime in seconds from /proc/uptime. In containers it equals host uptime.
function uptimeHours() {
    try {
        const content = fs.readFileSync('/proc/uptime', 'utf-8').trim().split(' ')[0];
        return (parseFloat(content) / 3600).toFixed(2);
    } catch(_) {
        return '0.00';
    }
}

function freeDiskMB() {
    try {
        const out = execSync('df -Pm / | tail -1 | awk \'{print $4}\'').toString().trim();
        return parseInt(out, 10);
    } catch(_) {
        return 0;
    }
}

function statusLine(prefix) {
    return `${prefix}: uptime ${uptimeHours()} hours, free disk in root: ${freeDiskMB()} MBytes`;
}

function postToStorage(line) {
    return new Promise((resolve, reject) => {
        const data = line;
        const url = new URL(`${STORAGE_URL}/log`);
        const req = http.request(
            {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'POST',
                headers: { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(data)},
            },
            (res) => {
                res.on('data', () => {});
                res.on('end', () => resolve());
            }
        );
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function appendToVStorage(line) {
    fs.mkdirSync('/vstorage', { recursive: true });
    fs.appendFileSync(VSTORAGE_FILE, line + '\n', 'utf-8');
}

app.get('/status', async (_req, res) => {
    try {
        const line1 = `Timestamp1:${isoUtcNow()} ${statusLine('status')}`;

        await postToStorage(line1);
        appendToVStorage(line1);

        http.get(`${SERVICE2_URL}/status`, (r2) => {
            let body = '';
            r2.on('data', (chunk) => (body += chunk));
            r2.on('end', () => {
                const combined = `${line1} \n${body.trim()}`;
                res.type('text/plain').send(combined);
            });
        }).on('error', (e) => {
            res.status(502).type('text/plain').send(`Service2 error: ${e.message}`);
        });
    } catch(e) {
        res.status(500).type('text/plain').send(`Service1 error: ${e.message}`);
    }
});

app.get('/log', (_req, res) => {
    http.get(`${STORAGE_URL}/log`, (r) => {
        res.status(r.statusCode || 200);
        res.type('text/plain');
        r.pipe(res);
    }).on('error', (e) => {
        res.status(502).type('text/plain').send(`Storage error: ${e.message}`);
    });
});

app.get('/', (_req, res) => {
    res.type('text/plain').send('OK. Try /status or /log');
});

app.listen(PORT, () => console.log(`Service1 listening on ${PORT}`));