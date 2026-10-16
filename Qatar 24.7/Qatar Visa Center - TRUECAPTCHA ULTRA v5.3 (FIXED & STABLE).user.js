// ==UserScript==
// @name         Qatar Visa Center - TRUECAPTCHA ULTRA v5.3 (FIXED & STABLE)
// @namespace    http://tampermonkey.net/
// @version      5.3
// @description  Perfect TrueCaptcha solver with proper delays & bulletproof submit detection
// @author       Community + Grok
// @match        https://www.qatarvisacenter.com/*
// @grant        GM_xmlhttpRequest
// @connect      api.apitruecaptcha.org
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // YOUR TRUECAPTCHA CREDENTIALS
    const USER_ID = 'YOUR_TRUECAPTCHA_USERID';
    const API_KEY = 'YOUR_TRUECAPTCHA_KEY';

    let solving = false;
    let lastImageData = null;

    const delay = ms => new Promise(r => setTimeout(r, ms));
    const $ = s => document.querySelector(s);
    const $$ = s => [...document.querySelectorAll(s)];

    // Force fresh captcha image
    function refreshCaptcha() {
        const img = $('#captchaImage');
        const btn = $('img.refresh');
        if (img) img.src = img.src.split('?')[0] + '?t=' + Date.now();
        if (btn) btn.click();
        lastImageData = null;
    }

    // Get clean base64 image with contrast boost
    async function getImageBase64() {
        const img = $('#captchaImage');
        if (!img || !img.complete || img.naturalHeight === 0) await delay(1000);

        const canvas = document.createElement('canvas');
        canvas.width = img.width || 150;
        canvas.height = img.height || 50;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const val = brightness > 140 ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = val;
        }
        ctx.putImageData(imageData, 0, 0);

        return canvas.toDataURL('image/png').split(',')[1];
    }

    // TrueCaptcha API
    async function solveWithTrueCaptcha(base64) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://api.apitruecaptcha.org/one/gettext",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({ userid: USER_ID, apikey: API_KEY, data: base64 }),
                timeout: 30000,
                onload: r => {
                    try {
                        const json = JSON.parse(r.responseText);
                        if (json.result) resolve(json.result.trim().toUpperCase());
                        else reject(json.error || 'No result');
                    } catch { reject('Parse error'); }
                },
                onerror: () => reject('Network error'),
                ontimeout: () => reject('Timeout')
            });
        });
    }

    // Human-like typing
    async function typeSlowly(input, text) {
        input.focus();
        input.value = '';
        for (const char of text) {
            input.value += char;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(100 + Math.random() * 200);
        }
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // BULLETPROOF SUBMIT BUTTON FINDER + DELAY
    async function clickSubmitButton() {
        await delay(3000 + Math.random() * 2000); // ← CRUCIAL DELAY BEFORE CLICK

        const possibleButtons = [
            '.btn-brand-arrow',
            'button.btn-brand-arrow',
            'button[type="submit"]',
            'button[type="button"]',
            'button:has-text("Submit")',
            'button:has-text("Continue")',
            'button:has-text("Next")'
        ];

        for (const sel of possibleButtons) {
            const btn = $(sel);
            if (btn && btn.offsetParent !== null && !btn.disabled) {
                console.log('CLICKING SUBMIT BUTTON:', sel);
                btn.scrollIntoView({ block: 'center' });
                await delay(800);
                btn.click();
                return true;
            }
        }

        // Fallback: search by text
        const allBtns = $$('button');
        for (const btn of allBtns) {
            const text = btn.textContent.trim().toLowerCase();
            if ((text.includes('submit') || text.includes('continue') || text.includes('next')) && !btn.disabled) {
                console.log('FALLBACK CLICK:', text);
                btn.scrollIntoView({ block: 'center' });
                await delay(800);
                btn.click();
                return true;
            }
        }

        console.warn('Submit button not found!');
        return false;
    }

    // MAIN SOLVER
    async function solveOnce() {
        if (solving) return;
        solving = true;

        try {
            console.log('Fetching new captcha image...');
            const base64 = await getImageBase64();

            if (base64 === lastImageData) {
                console.log('Same image → forcing refresh');
                refreshCaptcha();
                await delay(3000);
                solving = false;
                return solveOnce();
            }
            lastImageData = base64;

            console.log('Sending to TrueCaptcha...');
            const solution = await solveWithTrueCaptcha(base64);
            console.log('SOLUTION →', solution);

            const input = $('input[name="captcha"]');
            if (!input) throw 'Captcha input missing';

            await typeSlowly(input, solution);
            await clickSubmitButton(); // ← Now with perfect delay

        } catch (err) {
            console.error('Error:', err);
            refreshCaptcha();
            await delay(4000);
            solving = false;
            solveOnce();
        }
    }

    // Auto-retry on wrong captcha
    const observer = new MutationObserver(() => {
        const error = $('.val-pop.invalid_msg');
        if (error && error.textContent.toLowerCase().includes('valid captcha')) {
            console.log('WRONG CAPTCHA → RETRYING...');
            lastImageData = null;
            refreshCaptcha();
            setTimeout(() => { solving = false; solveOnce(); }, 3500);
        }

        if ($('#captchablock') && !solving) {
            setTimeout(solveOnce, 2500);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.log('QVC TRUECAPTCHA ULTRA v5.3 LOADED & READY');
    refreshCaptcha();

})();