// ==UserScript==
// @name         Qatar Visa Center - Ultimate Pro Assistant (v24.7.0)
// @namespace    http://tampermonkey.net/
// @version      24.7.0
// @description  Enhanced with Settings Panel and Fixed Month Navigation
// @author       MK
// @match        https://www.qatarvisacenter.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    /************* ULTIMATE AUTO ENGINE *************/
    const QVCAuto = {
        // Settings with defaults
        settings: {
            botSpeed: 'normal', // slow, normal, fast, ultrafast
            soundEnabled: true,
            monthNavigationSpeed: 1000,
            slotCheckInterval: 1000,
            autoFillSpeed: 1000,
            stealthMode: true,
            autoClickNext: true,
            autoClickConfirm: true,
            dateRangeEnabled: false
        },

        // Automation state
        isAutomationRunning: true,
        automationIntervals: [],

        // Existing variables
        isSubmitting: false,
        languageSelected: false,
        countrySelected: false,
        citySelected: false,
        slotCheckingEnabled: true,
        audioAlertEnabled: true,
        isMuted: false,
        checkingDirection: 'forward',
        monthsChecked: 0,
        maxMonthsToCheck: 2,
        currentMonthIndex: 0,
        lastMonthCheck: 0,
        apiCallInProgress: false,
        retryCount: 0,
        maxRetries: 3,
        errorCount: 0,
        maxErrors: 10,
        lastApiCallTime: 0,
        apiCallInterval: 8000,
        rateLimitCooldown: 60000,
        rateLimitHit: false,
        slotCheckInterval: 1,
        lastSlotCheckTime: 0,
        calendarLoaded: false,
        calendarCheckCount: 0,
        maxCalendarChecks: 3,
        calendarCheckInterval: 5000,
        slotsFound: false,
        currentPage: '',
        pageStabilizationTimer: null,
        navigationLock: false,
        lastNavigationTime: 0,
        navigationCooldown: 5000,
        slotBooked: false,
        actualSlotFound: false,
        pageChangeDetected: false,
        lastPageUrl: '',
        networkErrorCount: 0,
        maxNetworkErrors: 5,
        networkCooldownTime: 30000,
        sessionKeepAliveInterval: null,
        lastActivityTime: Date.now(),
        ignoredErrors: new Set(['lang/i18n', 'polyfills', 'main.', 'runtime.', '15.', 'static/', 'home', 'amenities.json']),
        formSubmitted: false,
        captchaSolved: false,
        captchaCheckInterval: null,
        waitingForCaptcha: false,
        captchaCheckAttempts: 0,
        maxCaptchaCheckAttempts: 300,
        captchaDetected: false,
        confirmButtonClicked: false,
        okButtonClicked: false,
        okButtonCheckInterval: null,
        formFilled: false,
        lastFillTime: 0,
        fillCooldown: 5000,
        continuousMonitoring: true,
        monitoringInterval: null,
        originalMonth: null,
        monthsToMonitor: 2,
        stealthRetryCount: 0,
        maxStealthRetries: 5,
        stealthDelay: 2000,
        randomUserAgent: true,
        isRescheduleMode: false,
        rescheduleButtonClicked: false,
        nextButtonClicked: false,
        currentMonthCheckCount: 0,
        sessionExpired: false,
        sessionRecoveryInProgress: false,
        lastSessionCheck: 0,
        sessionCheckInterval: 10000,
        startDate: null,
        endDate: null,
        monthCheckDuration: 7000,
        currentMonthCheckStartTime: 0,
        ultraFastMode: true,
        currentDate: null,
        currentMonth: null,
        currentYear: null,
        dateRangeApplied: false,
        managePageLoaded: false,
        managePageFormFilled: false,
        rescheduleButtonClickAttempted: false,
        monthCheckTimer: null,
        monthCheckCountdown: 0,
        managePageRescheduleClicked: false,
        totalMonthsInRange: 0,
        currentMonthInRange: 0,
        targetStartMonth: null,
        targetStartYear: null,
        targetEndMonth: null,
        targetEndYear: null,
        isNavigatingToStartMonth: false,

        init() {
            console.log('🚀 QVC ULTIMATE Engine v24.7.0 Starting with Settings Panel...');
            this.lastPageUrl = window.location.href;
            this.loadSettings();
            this.loadMuteState();
            this.loadDateRange();
            this.calculateMonthsInRange();
            this.applySpeedSettings();

            this.fixWebsiteErrors();
            this.fixInvalidPatterns();
            this.setupStealthMode();
            this.overrideFetch();
            this.overrideXMLHttpRequest();
            this.startSessionKeepAlive();
            this.monitorSessionExpiry();
            this.monitorInvalidCaptcha();
            this.setupErrorHandling();

            QVCUI.init();

            setTimeout(() => {
                this.ultraFastLanguageCountry();
                this.selectIslamabadWithRetry();
                this.autoClosePopups();
                this.enhanceFormFields();
                this.observeMutations();
                this.monitorPageChanges();
                this.initiatePageSpecificActions();

                setInterval(() => this.autoActions(), this.settings.autoFillSpeed);

                const path = window.location.pathname;
                if (path.includes('/schedule/slotdetails') || path.includes('/manage/reschedule')) {
                    console.log('📅 On calendar page, enabling enhanced slot checking');
                    this.startContinuousSlotMonitoring();
                }
            }, 2000);
        },

        // NEW: Start automation function
        startAutomation() {
            if (this.isAutomationRunning) return;

            console.log('▶️ Starting automation...');
            this.isAutomationRunning = true;
            this.slotCheckingEnabled = true;
            this.continuousMonitoring = true;

            QVCUI.showNotification('▶️ Automation Started', 'success');
            QVCUI.updateAutomationStatus(true);

            // Restart monitoring if on calendar page
            const path = window.location.pathname;
            if (path.includes('/schedule/slotdetails') || path.includes('/manage/reschedule')) {
                this.startContinuousSlotMonitoring();
            }
        },

        // NEW: Stop automation function
        stopAutomation() {
            if (!this.isAutomationRunning) return;

            console.log('⏸️ Stopping automation...');
            this.isAutomationRunning = false;
            this.slotCheckingEnabled = false;
            this.continuousMonitoring = false;

            // Stop all monitoring intervals
            this.stopContinuousSlotMonitoring();

            // Clear any active intervals
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }

            QVCUI.showNotification('⏸️ Automation Stopped', 'warning');
            QVCUI.updateAutomationStatus(false);
        },

        loadSettings() {
            try {
                const saved = GM_getValue('qvc_settings', null);
                if (saved) {
                    this.settings = { ...this.settings, ...saved };
                    console.log('⚙️ Settings loaded:', this.settings);
                }
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        },

        saveSettings() {
            try {
                GM_setValue('qvc_settings', this.settings);
                console.log('💾 Settings saved:', this.settings);
                this.applySpeedSettings();
            } catch (e) {
                console.error('Error saving settings:', e);
            }
        },

        applySpeedSettings() {
            const speeds = {
                slow: { nav: 2000, slot: 2000, fill: 2000, check: 10000 },
                normal: { nav: 1000, slot: 1000, fill: 1000, check: 7000 },
                fast: { nav: 500, slot: 500, fill: 500, check: 5000 },
                ultrafast: { nav: 100, slot: 100, fill: 100, check: 3000 }
            };

            const speed = speeds[this.settings.botSpeed] || speeds.normal;

            this.settings.monthNavigationSpeed = speed.nav;
            this.settings.slotCheckInterval = speed.slot;
            this.settings.autoFillSpeed = speed.fill;
            this.monthCheckDuration = speed.check;

            this.isMuted = !this.settings.soundEnabled;

            console.log('⚡ Speed settings applied:', speed);
        },

        calculateMonthsInRange() {
            if (!this.settings.dateRangeEnabled || !this.startDate || !this.endDate) {
                this.totalMonthsInRange = this.monthsToMonitor;
                this.targetStartMonth = null;
                this.targetStartYear = null;
                this.targetEndMonth = null;
                this.targetEndYear = null;
                return;
            }

            const start = new Date(this.startDate);
            const end = new Date(this.endDate);

            this.targetStartMonth = start.getMonth();
            this.targetStartYear = start.getFullYear();
            this.targetEndMonth = end.getMonth();
            this.targetEndYear = end.getFullYear();

            let months = (end.getFullYear() - start.getFullYear()) * 12;
            months -= start.getMonth();
            months += end.getMonth();
            months += 1;

            this.totalMonthsInRange = Math.max(1, months);
            console.log(`📅 Date Range: ${this.totalMonthsInRange} months (${start.toLocaleDateString()} to ${end.toLocaleDateString()})`);
            console.log(`🎯 Target: ${this.targetStartMonth}/${this.targetStartYear} to ${this.targetEndMonth}/${this.targetEndYear}`);
        },

        loadDateRange() {
            try {
                const savedStartDate = GM_getValue('qvc_start_date');
                const savedEndDate = GM_getValue('qvc_end_date');
                const savedMonthsToMonitor = GM_getValue('qvc_months_to_monitor', 2);

                if (savedStartDate && savedEndDate) {
                    this.startDate = new Date(savedStartDate);
                    this.endDate = new Date(savedEndDate);
                    this.monthsToMonitor = savedMonthsToMonitor;
                    this.dateRangeApplied = true;
                    console.log('📅 Loaded date range:', {
                        start: this.startDate.toLocaleDateString(),
                        end: this.endDate.toLocaleDateString()
                    });
                }
            } catch (e) {
                console.error('Error loading date range:', e);
            }
        },

        saveDateRange() {
            try {
                if (this.startDate && this.endDate) {
                    GM_setValue('qvc_start_date', this.startDate.toISOString());
                    GM_setValue('qvc_end_date', this.endDate.toISOString());
                    GM_setValue('qvc_months_to_monitor', this.monthsToMonitor);
                    this.dateRangeApplied = true;
                    this.calculateMonthsInRange();
                    console.log('💾 Date range saved');
                }
            } catch (e) {
                console.error('Error saving date range:', e);
            }
        },

        isCurrentMonthInRange() {
            if (!this.settings.dateRangeEnabled || !this.targetStartMonth || !this.targetStartYear) {
                return true;
            }

            if (!this.currentMonth || !this.currentYear) {
                this.updateCurrentDateFromCalendar();
            }

            const currentDate = new Date(this.currentYear, this.currentMonth, 1);
            const startDate = new Date(this.targetStartYear, this.targetStartMonth, 1);
            const endDate = new Date(this.targetEndYear, this.targetEndMonth, 1);

            const isInRange = currentDate >= startDate && currentDate <= endDate;

            console.log(`📅 Month check: ${this.currentMonth}/${this.currentYear} in range? ${isInRange}`);

            return isInRange;
        },

        setupErrorHandling() {
            window.addEventListener('error', (event) => {
                this.handleGlobalError(event.error);
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.handleGlobalError(event.reason);
            });
        },

        handleGlobalError(error) {
            const errorMessage = error?.message || error?.toString() || 'Unknown error';

            if (errorMessage.includes('sponsorType') ||
                errorMessage.includes('isLoungeEnabled') ||
                errorMessage.includes('vscAvailableDateTO') ||
                errorMessage.includes('isAppointmentBookingEnabled') ||
                errorMessage.includes('countryCode')) {
                return;
            }

            if (errorMessage.includes('Please enter valid Captcha') ||
                errorMessage.includes('Invalid Captcha')) {
                return;
            }

            if (errorMessage.includes('403') || errorMessage.includes('408') || errorMessage.includes('Network Error')) {
                this.networkErrorCount++;
                if (this.networkErrorCount >= this.maxNetworkErrors) {
                    this.handleSessionExpiry();
                }
            }
        },

        handleSessionExpiry() {
            if (this.sessionRecoveryInProgress) return;

            console.log('🔄 Session expiry detected, recovering...');
            this.sessionExpired = true;
            this.sessionRecoveryInProgress = true;
            this.stopContinuousSlotMonitoring();
            this.slotCheckingEnabled = false;

            QVCUI.showNotification('🔄 Session expired - Recovering...', 'warning', 5000);

            const wasRescheduleMode = this.isRescheduleMode;
            sessionStorage.setItem('qvc_recovery_mode', wasRescheduleMode ? 'reschedule' : 'book');

            setTimeout(() => {
                if (wasRescheduleMode) {
                    window.location.href = 'https://www.qatarvisacenter.com/manage';
                } else {
                    window.location.href = 'https://www.qatarvisacenter.com/schedule';
                }

                setTimeout(() => {
                    this.sessionExpired = false;
                    this.sessionRecoveryInProgress = false;
                    this.networkErrorCount = 0;
                    this.slotCheckingEnabled = true;
                    this.currentMonthInRange = 0;
                }, 3000);
            }, 2000);
        },

        loadMuteState() {
            try {
                this.isMuted = GM_getValue('qvc_muted', false);
            } catch (e) {
                this.isMuted = false;
            }
        },

        saveMuteState() {
            try {
                GM_setValue('qvc_muted', this.isMuted);
            } catch (e) {
                console.error('Error saving mute state:', e);
            }
        },

        toggleMute() {
            this.isMuted = !this.isMuted;
            this.settings.soundEnabled = !this.isMuted;
            this.saveMuteState();
            this.saveSettings();
            QVCUI.updateMuteButton();
            QVCUI.showNotification(
                this.isMuted ? '🔇 Alerts Muted' : '🔊 Alerts Enabled',
                this.isMuted ? 'warning' : 'success'
            );
        },

        monitorSessionExpiry() {
            setInterval(() => {
                try {
                    const currentPath = window.location.pathname;

                    if (currentPath === '/' || currentPath.includes('/home')) {
                        const wasOnSlots = sessionStorage.getItem('qvc_was_on_slots');
                        if (wasOnSlots === 'true' && !this.sessionRecoveryInProgress) {
                            this.handleSessionExpiry();
                            return;
                        }
                    }

                    if (this.networkErrorCount >= 3 && !this.sessionRecoveryInProgress) {
                        this.handleSessionExpiry();
                    }

                    if (currentPath.includes('/schedule/slotdetails') || currentPath.includes('/manage/reschedule')) {
                        sessionStorage.setItem('qvc_was_on_slots', 'true');
                        this.sessionExpired = false;
                    }

                } catch (e) {
                    console.error('Error in monitorSessionExpiry:', e);
                }
            }, this.sessionCheckInterval);
        },

        monitorInvalidCaptcha() {
            setInterval(() => {
                try {
                    const invalidCaptchaDiv = document.querySelector('.val-pop.invalid_msg');
                    if (invalidCaptchaDiv && invalidCaptchaDiv.textContent.toLowerCase().includes('captcha')) {
                        QVCUI.showNotification('❌ Invalid CAPTCHA - Please solve manually', 'error', 5000);
                    }
                } catch (e) {}
            }, 3000);
        },

        autoClickNextButton() {
            if (!this.settings.autoClickNext || !this.isAutomationRunning) return false;

            try {
                if (this.nextButtonClicked || this.sessionRecoveryInProgress) return;

                const path = window.location.pathname;
                if (!path.includes('/slotdetails') && !path.includes('/reschedule')) return;

                const nextSelectors = [
                    'button[translate="schedule.next"]',
                    'button.cir-em-btn:contains("Next")',
                    'button.btn.cir-em-btn.mt-20.ml-20'
                ];

                let nextButton = null;
                for (let selector of nextSelectors) {
                    if (selector.includes(':contains(')) {
                        const parts = selector.split(':contains(');
                        const baseSelector = parts[0];
                        const text = parts[1].replace(/[")]/g, '');
                        const elements = document.querySelectorAll(baseSelector);
                        for (let element of elements) {
                            if (element.textContent && element.textContent.trim().toLowerCase() === text.toLowerCase()) {
                                nextButton = element;
                                break;
                            }
                        }
                    } else {
                        nextButton = document.querySelector(selector);
                    }
                    if (nextButton && this.isElementVisible(nextButton) && !nextButton.disabled) break;
                }

                if (nextButton && this.isElementVisible(nextButton) && !nextButton.disabled) {
                    console.log('🎯 Clicking Next button');
                    QVCUI.showNotification('➡️ Auto-clicking Next', 'success');
                    nextButton.click();
                    this.nextButtonClicked = true;
                    setTimeout(() => { this.nextButtonClicked = false; }, 5000);
                    return true;
                }
            } catch (e) {
                console.error('Error in autoClickNextButton:', e);
            }
            return false;
        },

        autoClickConfirmOnReviewSummary() {
            if (!this.settings.autoClickConfirm || !this.isAutomationRunning) return false;

            try {
                const path = window.location.pathname;
                if (!path.includes('/reviewsummary')) return;

                this.checkCaptchaStatus();
                if (this.captchaDetected && !this.captchaSolved) {
                    console.log('🔐 Waiting for CAPTCHA');
                    return;
                }

                if (this.confirmButtonClicked || this.sessionRecoveryInProgress) return;

                const confirmButton = document.querySelector('button[translate="schedule.confirm"]');
                if (confirmButton && this.isElementVisible(confirmButton)) {
                    console.log('🎯 Clicking Confirm button');
                    QVCUI.showNotification('✅ Auto-clicking Confirm', 'success');
                    confirmButton.click();
                    this.confirmButtonClicked = true;
                    setTimeout(() => { this.confirmButtonClicked = false; }, 5000);
                    return true;
                }
            } catch (e) {
                console.error('Error in autoClickConfirmOnReviewSummary:', e);
            }
            return false;
        },

        fixWebsiteErrors() {
            try {
                // Suppress console errors for known website issues
                const originalError = console.error;
                console.error = function(...args) {
                    const errorStr = args.join(' ').toLowerCase();
                    if (errorStr.includes('sponsortype') ||
                        errorStr.includes('isloungeenabled') ||
                        errorStr.includes('vscavailabledateto') ||
                        errorStr.includes('isappointmentbookingenabled') ||
                        errorStr.includes('countrycode')) {
                        return; // Suppress these errors
                    }
                    originalError.apply(console, args);
                };

                // Property override to fix undefined errors
                const originalDefineProperty = Object.defineProperty;
                Object.defineProperty = function(obj, prop, descriptor) {
                    if ((prop === 'isLoungeEnabled' || prop === 'sponsorType') && descriptor && descriptor.get) {
                        descriptor.get = function() { return false; };
                    }
                    return originalDefineProperty.call(this, obj, prop, descriptor);
                };

                // Global error handler
                window.addEventListener('error', (event) => {
                    const errorMsg = event.message?.toLowerCase() || '';
                    if (errorMsg.includes('sponsortype') ||
                        errorMsg.includes('isloungeenabled') ||
                        errorMsg.includes('vscavailabledateto') ||
                        errorMsg.includes('isappointmentbookingenabled') ||
                        errorMsg.includes('countrycode')) {
                        event.preventDefault();
                        event.stopPropagation();
                        return true;
                    }
                }, true);

                // Unhandled promise rejections
                window.addEventListener('unhandledrejection', (event) => {
                    const reason = event.reason?.message?.toLowerCase() || '';
                    if (reason.includes('sponsortype') ||
                        reason.includes('isloungeenabled') ||
                        reason.includes('403') ||
                        reason.includes('forbidden')) {
                        event.preventDefault();
                        return true;
                    }
                });

            } catch (e) {
                console.log('Error handler setup failed:', e);
            }
        },

        setupStealthMode() {
            if (!this.settings.stealthMode) return;

            try {
                if (this.randomUserAgent) {
                    const userAgents = [
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
                    ];
                    Object.defineProperty(navigator, 'userAgent', {
                        get: function() { return userAgents[0]; },
                        configurable: false
                    });
                }
            } catch (e) {}
        },

        fixInvalidPatterns() {
            const fixPatterns = () => {
                const inputs = document.querySelectorAll('input[pattern]');
                inputs.forEach(input => {
                    const pattern = input.getAttribute('pattern');
                    if (pattern && pattern.includes('\\g')) {
                        input.setAttribute('pattern', pattern.replace(/\\g/g, ''));
                    }
                });
            };
            fixPatterns();
            setInterval(fixPatterns, 5000);
        },

        startSessionKeepAlive() {
            if (this.sessionKeepAliveInterval) {
                clearInterval(this.sessionKeepAliveInterval);
            }

            this.sessionKeepAliveInterval = setInterval(() => {
                this.keepSessionAlive();
            }, 180000);

            setInterval(() => {
                this.minimalSessionKeepAlive();
            }, 90000);
        },

        minimalSessionKeepAlive() {
            try {
                this.lastActivityTime = Date.now();
                const keepAliveUrl = window.location.origin + '/assets/favicon.ico?' + Date.now();
                fetch(keepAliveUrl, {
                    method: 'HEAD',
                    credentials: 'include',
                    mode: 'no-cors'
                }).catch(() => {});
            } catch (e) {}
        },

        keepSessionAlive() {
            try {
                const currentUrl = window.location.href;
                fetch(currentUrl, {
                    method: 'HEAD',
                    credentials: 'include'
                }).catch((error) => {
                    this.networkErrorCount++;
                });
                this.lastActivityTime = Date.now();
            } catch (e) {
                this.networkErrorCount++;
            }
        },

        overrideFetch() {
            const originalFetch = window.fetch;
            const self = this;

            window.fetch = function(url, options) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                if (options) {
                    options.signal = controller.signal;
                } else {
                    options = { signal: controller.signal };
                }

                return originalFetch(url, options)
                    .then(response => {
                        clearTimeout(timeoutId);
                        if (!response.ok) {
                            self.handleHttpError(url, response.status, response.statusText);
                        }
                        return response;
                    })
                    .catch(error => {
                        clearTimeout(timeoutId);
                        if (url.includes('qatarvisacenter.com') && !self.shouldIgnoreError(url)) {
                            self.handleNetworkError(url, error);
                        }
                        throw error;
                    });
            };
        },

        overrideXMLHttpRequest() {
            const originalXHR = window.XMLHttpRequest;
            const self = this;

            window.XMLHttpRequest = function() {
                const xhr = new originalXHR();
                const originalOpen = xhr.open;
                const originalSend = xhr.send;

                xhr.open = function(method, url, ...args) {
                    this._url = url;
                    return originalOpen.apply(this, [method, url, ...args]);
                };

                xhr.send = function(data) {
                    this.addEventListener('load', function() {
                        if (this.status >= 400) {
                            self.handleHttpError(this._url, this.status, this.statusText);
                        }
                    });

                    this.addEventListener('error', function() {
                        if (this._url && this._url.includes('qatarvisacenter.com') && !self.shouldIgnoreError(this._url)) {
                            self.handleNetworkError(this._url, new Error('XHR Network Error'));
                        }
                    });

                    return originalSend.call(this, data);
                };

                return xhr;
            };
        },

        shouldIgnoreError(url) {
            for (let pattern of this.ignoredErrors) {
                if (url.includes(pattern)) return true;
            }
            return false;
        },

        handleNetworkError(url, error) {
            this.errorCount++;
            this.networkErrorCount++;

            if (this.networkErrorCount >= this.maxNetworkErrors && !this.sessionRecoveryInProgress) {
                this.handleSessionExpiry();
            }
        },

        handleHttpError(url, status, statusText) {
            this.errorCount++;

            if (status === 429) {
                this.rateLimitHit = true;
                this.slotCheckingEnabled = false;
                setTimeout(() => {
                    this.rateLimitHit = false;
                    this.slotCheckingEnabled = true;
                }, this.rateLimitCooldown);
                return;
            }

            if (status === 403 || status === 408) {
                this.networkErrorCount++;
                if (this.networkErrorCount >= this.maxNetworkErrors && !this.sessionRecoveryInProgress) {
                    this.handleSessionExpiry();
                }
            }
        },

        checkCaptchaStatus() {
            try {
                this.captchaDetected = false;

                const captchaIndicators = [
                    '.g-recaptcha',
                    'iframe[src*="google.com/recaptcha"]',
                    '#g-recaptcha-response'
                ];

                let captchaFound = false;
                for (let selector of captchaIndicators) {
                    if (document.querySelector(selector)) {
                        captchaFound = true;
                        this.captchaDetected = true;
                        break;
                    }
                }

                if (!captchaFound) {
                    this.captchaSolved = true;
                    this.captchaDetected = false;
                    return true;
                }

                if (this.isCaptchaSolved()) {
                    this.captchaSolved = true;
                    QVCUI.showNotification('✅ CAPTCHA solved!', 'success', 3000);
                    return true;
                } else {
                    this.captchaSolved = false;
                    return false;
                }
            } catch (e) {
                return false;
            }
        },

        isCaptchaSolved() {
            try {
                const gRecaptchaResponse = document.querySelector('#g-recaptcha-response');
                if (gRecaptchaResponse && gRecaptchaResponse.value && gRecaptchaResponse.value.length > 50) {
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            }
        },

        monitorPageChanges() {
            let lastUrl = window.location.href;

            setInterval(() => {
                const currentUrl = window.location.href;
                if (currentUrl !== lastUrl) {
                    console.log('🔄 Page changed to', currentUrl);
                    lastUrl = currentUrl;
                    this.pageChangeDetected = true;
                    this.lastPageUrl = currentUrl;

                    this.formSubmitted = false;
                    this.captchaSolved = false;
                    this.captchaDetected = false;
                    this.confirmButtonClicked = false;
                    this.okButtonClicked = false;
                    this.nextButtonClicked = false;
                    this.formFilled = false;
                    this.managePageLoaded = false;
                    this.managePageFormFilled = false;
                    this.managePageRescheduleClicked = false;

                    if (currentUrl.includes('/manage/reschedule') || currentUrl.includes('/schedule/slotdetails')) {
                        if (!this.monitoringInterval) {
                            setTimeout(() => this.startContinuousSlotMonitoring(), 2000);
                        }
                    } else {
                        if (this.monitoringInterval) {
                            clearInterval(this.monitoringInterval);
                            this.monitoringInterval = null;
                            this.continuousMonitoring = false;
                        }
                    }

                    this.fixInvalidPatterns();

                    if (this.pageStabilizationTimer) {
                        clearTimeout(this.pageStabilizationTimer);
                    }

                    this.pageStabilizationTimer = setTimeout(() => {
                        this.initiatePageSpecificActions();
                        this.pageChangeDetected = false;
                    }, 3000);
                }
            }, 1000);
        },

        initiatePageSpecificActions() {
            const path = window.location.pathname;
            console.log('📍 Current path:', path);

            this.calendarLoaded = false;
            this.slotsFound = false;
            this.actualSlotFound = false;

            setTimeout(() => this.checkCaptchaStatus(), 1000);

            if (path.includes('/manage') && !path.includes('/reschedule')) {
                this.currentPage = 'manage';
                this.managePageLoaded = true;
                this.managePageRescheduleClicked = false;
                setTimeout(() => this.handleManagePageActions(), 2000);

            } else if (path.includes('/manage/reschedule')) {
                this.currentPage = 'reschedule';
                this.isRescheduleMode = true;
                setTimeout(() => {
                    if (!this.monitoringInterval) {
                        this.startContinuousSlotMonitoring();
                    }
                }, 2000);
                setInterval(() => this.autoClickNextButton(), 2000);

            } else if (path.includes('/schedule/slotdetails')) {
                this.currentPage = 'slotdetails';
                this.isRescheduleMode = false;
                setTimeout(() => {
                    this.selectIslamabadWithRetry();
                    if (!this.monitoringInterval) {
                        this.startContinuousSlotMonitoring();
                    }
                }, 1000);
                setInterval(() => this.autoClickNextButton(), 2000);

            } else if (path.includes('/reviewsummary')) {
                this.currentPage = 'reviewsummary';
                setInterval(() => this.autoClickConfirmOnReviewSummary(), 2000);
            }
        },

        handleManagePageActions() {
            if (!this.managePageLoaded || this.managePageRescheduleClicked) return;

            if (!this.managePageFormFilled) {
                if (!this.areAllRequiredFieldsFilled()) {
                    this.manualFillFields();
                    setTimeout(() => {
                        this.managePageFormFilled = this.areAllRequiredFieldsFilled();
                        if (this.managePageFormFilled) {
                            this.clickRescheduleButtonOnce();
                        }
                    }, 1000);
                } else {
                    this.managePageFormFilled = true;
                    this.clickRescheduleButtonOnce();
                }
            } else {
                this.clickRescheduleButtonOnce();
            }
        },

        clickRescheduleButtonOnce() {
            if (this.managePageRescheduleClicked || this.sessionRecoveryInProgress) return;

            try {
                const rescheduleButton = document.querySelector('button[translate="manage.reschedule"].cir-em-btn');

                if (rescheduleButton && this.isElementVisible(rescheduleButton)) {
                    QVCUI.showNotification('🔄 Clicking Reschedule button...', 'success');
                    this.managePageRescheduleClicked = true;
                    this.rescheduleButtonClicked = true;
                    this.isRescheduleMode = true;

                    setTimeout(() => {
                        rescheduleButton.click();
                    }, 500);

                    return true;
                } else {
                    setTimeout(() => {
                        if (!this.managePageRescheduleClicked) {
                            this.clickRescheduleButtonOnce();
                        }
                    }, 1000);
                }
            } catch (e) {
                console.error('Error clicking reschedule button:', e);
            }
            return false;
        },

        ultraFastLanguageCountry() {
            setTimeout(() => {
                try {
                    this.selectEnglish();
                } catch (e) {}
            }, 800);

            setTimeout(() => {
                try {
                    this.selectPakistan();
                } catch (e) {}
            }, 1500);
        },

        selectEnglish() {
            if (this.languageSelected) return;

            try {
                const englishElements = document.querySelectorAll('a, span, div, li, button');
                for (let element of englishElements) {
                    if (element.textContent && element.textContent.trim().toLowerCase() === 'english') {
                        element.click();
                        this.languageSelected = true;
                        QVCUI.showNotification('✅ English Selected', 'success');
                        return true;
                    }
                }
            } catch (e) {}
            return false;
        },

        selectPakistan() {
            if (this.countrySelected || !this.languageSelected) return;

            try {
                const pakistanElements = document.querySelectorAll('a, span, div, li, button');
                for (let element of pakistanElements) {
                    if (element.textContent && element.textContent.trim().toLowerCase() === 'pakistan') {
                        element.click();
                        this.countrySelected = true;
                        QVCUI.showNotification('✅ Pakistan Selected', 'success');
                        return true;
                    }
                }
            } catch (e) {}
            return false;
        },

        selectIslamabadWithRetry() {
            if (this.citySelected) return;

            const attemptSelection = (attempt = 1) => {
                try {
                    const selectedCity = document.querySelector('button[name="selectedVsc"] p');
                    if (selectedCity && selectedCity.textContent.trim() === 'Islamabad') {
                        this.citySelected = true;
                        return true;
                    }

                    if (this.isRescheduleMode) {
                        this.citySelected = true;
                        return true;
                    }

                    const dropdownButton = document.querySelector('button[name="selectedVsc"]');
                    if (dropdownButton) {
                        dropdownButton.click();

                        setTimeout(() => {
                            const options = document.querySelectorAll('.dropdown-menu a, .dropdown-menu li a');
                            for (let option of options) {
                                if (option.textContent && option.textContent.trim() === 'Islamabad') {
                                    option.click();
                                    this.citySelected = true;
                                    QVCUI.showNotification('✅ Islamabad Selected', 'success');
                                    return true;
                                }
                            }

                            if (attempt < 3) {
                                setTimeout(() => attemptSelection(attempt + 1), 1000);
                            }
                        }, 500);
                    }
                } catch (e) {
                    if (attempt < 3) {
                        setTimeout(() => attemptSelection(attempt + 1), 1000);
                    }
                }
            };

            attemptSelection();
        },

        autoClosePopups() {
            try {
                const closeButtons = ['button[data-bs-dismiss="modal"]', 'button[title="Close"]', '.btn-close'];
                for (let selector of closeButtons) {
                    const buttons = document.querySelectorAll(selector);
                    for (let btn of buttons) {
                        if (this.isElementVisible(btn)) {
                            btn.click();
                            return;
                        }
                    }
                }
            } catch (e) {}
        },

        observeMutations() {
            try {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.addedNodes.length > 0) {
                            this.autoClosePopups();
                            this.enhanceFormFields();
                        }
                    });
                });
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            } catch (e) {}
        },

        enhanceFormFields() {
            const enhanceFields = () => {
                try {
                    const fields = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]');
                    fields.forEach((field, index) => {
                        if (!field.id) field.id = `qvc-field-${Date.now()}-${index}`;
                        if (!field.name) {
                            const placeholder = (field.placeholder || '').toLowerCase();
                            if (placeholder.includes('passport')) field.name = 'passport_number';
                            else if (placeholder.includes('visa')) field.name = 'visa_number';
                            else if (placeholder.includes('name')) field.name = 'full_name';
                            else if (field.type === 'tel') field.name = 'phone_number';
                            else if (field.type === 'email') field.name = 'email_address';
                        }
                    });
                } catch (e) {}
            };
            enhanceFields();
            setInterval(enhanceFields, 3000);
        },

        areAllRequiredFieldsFilled() {
            try {
                const path = window.location.pathname;

                if (path.includes('/schedule') && !path.includes('/applicantdetails')) {
                    return this.isFieldFilled('input[placeholder*="Passport"]') &&
                           this.isFieldFilled('input[placeholder*="Visa"]');
                }

                if (path.includes('/schedule/applicantdetails')) {
                    return this.isFieldFilled('input[type="tel"]') &&
                           this.isFieldFilled('input[type="email"]') &&
                           this.isFieldFilled('input[placeholder*="Name"]');
                }

                if (path.includes('/manage') && !path.includes('/reschedule')) {
                    return this.isFieldFilled('input[placeholder*="Passport"]') &&
                           this.isFieldFilled('input[placeholder*="Visa"]');
                }

                return false;
            } catch (e) {
                return false;
            }
        },

        isFieldFilled(selector) {
            try {
                const fields = document.querySelectorAll(selector);
                for (let field of fields) {
                    if (field && field.value && field.value.trim().length > 0) {
                        return true;
                    }
                }
                return false;
            } catch (e) {
                return false;
            }
        },

        manualFillFields() {
            if (!this.isAutomationRunning) return;

            try {
                const currentClient = QVCUI.getCurrentClient();
                if (!currentClient) {
                    QVCUI.showNotification('❌ Select a client first!', 'error');
                    return;
                }

                const now = Date.now();
                if (this.formFilled && (now - this.lastFillTime < this.fillCooldown)) return;

                const path = window.location.pathname;
                let filledAny = false;

                if (path.includes('/schedule') && !path.includes('/applicantdetails')) {
                    if (this.fillField('input[placeholder*="Passport"]', currentClient.passport)) filledAny = true;
                    if (this.fillField('input[placeholder*="Visa"]', currentClient.visa)) filledAny = true;
                }

                if (path.includes('/schedule/applicantdetails')) {
                    if (this.fillField('input[placeholder*="Name"]', currentClient.name)) filledAny = true;
                    if (this.fillField('input[type="tel"]', currentClient.mobile)) filledAny = true;
                    if (this.fillField('input[type="email"]', currentClient.email)) filledAny = true;

                    const checkbox = document.querySelector('input[type="checkbox"][id="checkVal"]');
                    if (checkbox && !checkbox.checked) {
                        checkbox.click();
                        filledAny = true;
                    }
                }

                if (path.includes('/manage') && !path.includes('/reschedule')) {
                    const passportSelectors = ['input[placeholder*="Passport"]', 'input[name*="passport"]'];
                    for (let selector of passportSelectors) {
                        if (this.fillField(selector, currentClient.passport)) {
                            filledAny = true;
                            break;
                        }
                    }

                    const visaSelectors = ['input[placeholder*="Visa"]', 'input[name*="visa"]'];
                    for (let selector of visaSelectors) {
                        if (this.fillField(selector, currentClient.visa)) {
                            filledAny = true;
                            break;
                        }
                    }
                }

                if (filledAny) {
                    this.formFilled = true;
                    this.lastFillTime = now;
                    QVCUI.showNotification(`✅ ${currentClient.name} data filled!`, 'success');
                }
            } catch (e) {
                console.error('Error in manualFillFields:', e);
            }
        },

        fillField(selector, value) {
            try {
                if (!value) return false;
                const fields = document.querySelectorAll(selector);
                let filled = false;

                for (let field of fields) {
                    if (field && this.isElementVisible(field)) {
                        if (!field.value || field.value.trim() === '' || field.value !== value) {
                            field.value = value;
                            this.triggerEvent(field, 'input');
                            this.triggerEvent(field, 'change');
                            filled = true;
                        }
                    }
                }
                return filled;
            } catch (e) {
                return false;
            }
        },

        triggerEvent(element, eventType) {
            try {
                const event = new Event(eventType, { bubbles: true });
                element.dispatchEvent(event);
            } catch (e) {}
        },

        autoActions() {
            if (!this.isAutomationRunning) return;

            try {
                const path = window.location.pathname;
                const currentClient = QVCUI.getCurrentClient();
                if (!currentClient) return;

                const now = Date.now();
                if (this.formFilled && (now - this.lastFillTime < this.fillCooldown)) return;

                if (path.includes('/schedule') && !path.includes('/applicantdetails')) {
                    if (this.fillField('input[placeholder*="Passport"]', currentClient.passport)) {
                        this.formFilled = true;
                        this.lastFillTime = now;
                    }
                    if (this.fillField('input[placeholder*="Visa"]', currentClient.visa)) {
                        this.formFilled = true;
                        this.lastFillTime = now;
                    }
                }

                if (path.includes('/manage') && !path.includes('/reschedule')) {
                    if (!this.managePageFormFilled && !this.managePageRescheduleClicked) {
                        this.fillField('input[placeholder*="Passport"]', currentClient.passport);
                        this.fillField('input[placeholder*="Visa"]', currentClient.visa);
                    }
                }
            } catch (e) {}
        },

        isElementVisible(element) {
            try {
                return element.offsetParent !== null &&
                       element.getBoundingClientRect().width > 0 &&
                       element.getBoundingClientRect().height > 0;
            } catch (e) {
                return false;
            }
        },

        checkMonthForSlots() {
            try {
                if (this.sessionRecoveryInProgress) return false;

                // Check if current month is in the date range
                if (this.settings.dateRangeEnabled && !this.isCurrentMonthInRange()) {
                    console.log(`⏭️ Skipping month ${this.currentMonth}/${this.currentYear} (outside range)`);
                    return false;
                }

                console.log(`🔍 Checking month ${this.currentMonthInRange + 1}/${this.totalMonthsInRange}`);

                const daySelectors = [
                    '.datepicker__day:not(.is-disabled) button',
                    '.calendar-day:not(.disabled) button',
                    '.day:not(.disabled) button'
                ];

                let availableDays = [];
                for (let selector of daySelectors) {
                    availableDays = document.querySelectorAll(selector);
                    if (availableDays.length > 0) break;
                }

                let actuallyAvailableDays = [];
                for (let day of availableDays) {
                    if (!day.disabled && !day.closest('.is-disabled') &&
                        !day.closest('.weeklyOff') && day.offsetParent !== null) {
                        actuallyAvailableDays.push(day);
                    }
                }

                if (actuallyAvailableDays.length > 0) {
                    console.log(`🎉 Found ${actuallyAvailableDays.length} slots in month ${this.currentMonthInRange + 1}`);
                    this.slotsFound = true;
                    this.actualSlotFound = true;

                    this.playAppointmentOpenAlert();

                    actuallyAvailableDays[0].click();
                    QVCUI.showNotification(`🎉 SLOT FOUND!`, 'success');

                    setTimeout(() => this.checkTimeSlots(), 100);
                    this.networkErrorCount = 0;

                    return true;
                }

                return false;
            } catch (e) {
                console.error('Error in checkMonthForSlots:', e);
                this.networkErrorCount++;
                return false;
            }
        },

        checkTimeSlots() {
            try {
                const noSlotsMessage = document.querySelector('div[translate="schedule.no_slotDate"]');
                if (noSlotsMessage && this.isElementVisible(noSlotsMessage)) {
                    const availableDays = document.querySelectorAll('.datepicker__day:not(.is-disabled) button');
                    const randomIndex = Math.floor(Math.random() * availableDays.length);
                    if (availableDays[randomIndex]) {
                        availableDays[randomIndex].click();
                        setTimeout(() => this.checkTimeSlots(), 100);
                        return false;
                    }
                }

                const timeSlotSelectors = [
                    '.time-slot button:not([disabled])',
                    '.slot-time button:not([disabled])'
                ];

                let availableSlots = [];
                for (let selector of timeSlotSelectors) {
                    const slots = document.querySelectorAll(selector);
                    for (let slot of slots) {
                        if (this.isElementVisible(slot) && !slot.disabled) {
                            availableSlots.push(slot);
                        }
                    }
                    if (availableSlots.length > 0) break;
                }

                if (availableSlots.length > 0) {
                    this.playSlotFoundAlert();
                    availableSlots[0].click();
                    QVCUI.showNotification('✅ Time slot selected!', 'success');
                    setTimeout(() => this.autoClickNextButton(), 100);
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            }
        },

        playAppointmentOpenAlert() {
            if (this.isMuted || !this.settings.soundEnabled) return;

            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 1.5);

                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance('Appointment Open');
                    utterance.rate = 1.2;
                    speechSynthesis.speak(utterance);
                }
            } catch (e) {}
        },

        playSlotFoundAlert() {
            if (this.isMuted || !this.settings.soundEnabled) return;

            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = 900;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 1.5);

                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance('Slot Found');
                    utterance.rate = 1.2;
                    speechSynthesis.speak(utterance);
                }
            } catch (e) {}
        },

        startContinuousSlotMonitoring() {
            if (!this.isAutomationRunning) {
                console.log('⏸️ Automation is stopped - Slot monitoring disabled');
                return;
            }

            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
            }

            this.networkErrorCount = 0;
            this.currentMonthInRange = 0;
            this.continuousMonitoring = true;
            this.monthsChecked = 0;
            this.currentMonthCheckStartTime = Date.now();

            this.updateCurrentDateFromCalendar();
            this.calculateMonthsInRange();

            console.log('🔄 Starting slot monitoring...');
            console.log(`📅 Will monitor ${this.totalMonthsInRange} months`);

            // Navigate to start month if date range is enabled
            if (this.settings.dateRangeEnabled && this.targetStartMonth !== null) {
                this.navigateToStartMonth();
            }

            setTimeout(() => {
                if (!this.sessionRecoveryInProgress) {
                    this.enhancedContinuousSlotCheck();
                }
            }, 3000);

            this.monitoringInterval = setInterval(() => {
                if (!this.sessionRecoveryInProgress && this.slotCheckingEnabled) {
                    this.enhancedContinuousSlotCheck();
                }
            }, this.settings.slotCheckInterval);
        },

        navigateToStartMonth() {
            if (!this.currentMonth || !this.currentYear) {
                this.updateCurrentDateFromCalendar();
            }

            const currentDate = new Date(this.currentYear, this.currentMonth, 1);
            const targetDate = new Date(this.targetStartYear, this.targetStartMonth, 1);

            if (currentDate.getTime() === targetDate.getTime()) {
                console.log('✅ Already at start month');
                return;
            }

            const monthsDiff = (this.targetStartYear - this.currentYear) * 12 +
                              (this.targetStartMonth - this.currentMonth);

            console.log(`🎯 Navigating ${monthsDiff} months to reach start date`);

            if (monthsDiff > 0) {
                this.navigateForward(monthsDiff);
            } else if (monthsDiff < 0) {
                this.navigateBackward(Math.abs(monthsDiff));
            }
        },

        navigateForward(count) {
            if (count <= 0) {
                console.log('✅ Reached start month');
                this.currentMonthInRange = 0;
                this.currentMonthCheckStartTime = Date.now();
                return;
            }

            setTimeout(() => {
                if (this.navigateToNextMonth()) {
                    this.navigateForward(count - 1);
                } else {
                    setTimeout(() => this.navigateForward(count), 1000);
                }
            }, this.settings.monthNavigationSpeed);
        },

        navigateBackward(count) {
            if (count <= 0) {
                console.log('✅ Reached start month');
                this.currentMonthInRange = 0;
                this.currentMonthCheckStartTime = Date.now();
                return;
            }

            setTimeout(() => {
                if (this.navigateToPreviousMonth()) {
                    this.navigateBackward(count - 1);
                } else {
                    setTimeout(() => this.navigateBackward(count), 1000);
                }
            }, this.settings.monthNavigationSpeed);
        },

        updateCurrentDateFromCalendar() {
            try {
                const monthYearElement = document.querySelector('.navigation__title');
                if (monthYearElement) {
                    const monthYearText = monthYearElement.textContent.trim();
                    const parts = monthYearText.split(' ');

                    if (parts.length === 2) {
                        const monthName = parts[0];
                        const year = parseInt(parts[1]);

                        const months = {
                            'January': 0, 'February': 1, 'March': 2, 'April': 3,
                            'May': 4, 'June': 5, 'July': 6, 'August': 7,
                            'September': 8, 'October': 9, 'November': 10, 'December': 11
                        };

                        this.currentMonth = months[monthName];
                        this.currentYear = year;
                        this.currentDate = new Date(year, this.currentMonth, 1);
                    }
                }
            } catch (e) {}
        },

        enhancedContinuousSlotCheck() {
            if (!this.continuousMonitoring || this.sessionRecoveryInProgress || !this.isAutomationRunning) return;

            if (this.networkErrorCount >= 3) {
                this.stopContinuousSlotMonitoring();
                return;
            }

            // Update current calendar month
            this.updateCurrentDateFromCalendar();

            // Check if we should monitor this month
            if (this.settings.dateRangeEnabled) {
                if (!this.isCurrentMonthInRange()) {
                    console.log(`⏭️ Skipping month ${this.currentMonth}/${this.currentYear}`);
                    this.moveToNextMonthInRange();
                    return;
                }
            }

            if (this.checkMonthForSlots()) {
                console.log('✅ Slots found! Stopping monitoring.');
                this.stopContinuousSlotMonitoring();
                return;
            }

            const now = Date.now();
            const timeInCurrentMonth = now - this.currentMonthCheckStartTime;

            if (timeInCurrentMonth >= this.monthCheckDuration) {
                console.log(`⏰ Moving to next month`);
                this.moveToNextMonthInRange();
            }
        },

        moveToNextMonthInRange() {
            this.currentMonthCheckStartTime = Date.now();
            this.currentMonthInRange++;

            console.log(`🔄 Progress: ${this.currentMonthInRange}/${this.totalMonthsInRange}`);

            if (this.currentMonthInRange < this.totalMonthsInRange) {
                if (this.navigateToNextMonth()) {
                    console.log(`➡️ Moved to next month (${this.currentMonthInRange + 1}/${this.totalMonthsInRange})`);
                } else {
                    setTimeout(() => this.navigateToNextMonth(), 1000);
                }
            } else {
                console.log('🔄 Completed all months, restarting...');
                this.restartFromFirstMonth();
            }
        },

        navigateToNextMonth() {
            try {
                if (this.sessionRecoveryInProgress) return false;

                const nextButton = document.querySelector('.navigation__button.is-next, .next-month');
                if (nextButton && this.isElementVisible(nextButton) && !nextButton.disabled) {
                    nextButton.click();

                    if (this.currentMonth === 11) {
                        this.currentMonth = 0;
                        this.currentYear++;
                    } else {
                        this.currentMonth++;
                    }
                    this.currentDate = new Date(this.currentYear, this.currentMonth, 1);

                    console.log(`📅 Now at: ${this.currentDate.toLocaleDateString()}`);
                    this.networkErrorCount = Math.max(0, this.networkErrorCount - 1);

                    return true;
                }
                return false;
            } catch (e) {
                this.networkErrorCount++;
                return false;
            }
        },

        navigateToPreviousMonth() {
            try {
                if (this.sessionRecoveryInProgress) return false;

                const prevButton = document.querySelector('.navigation__button.is-previous, .prev-month');
                if (prevButton && this.isElementVisible(prevButton) && !prevButton.disabled) {
                    prevButton.click();

                    if (this.currentMonth === 0) {
                        this.currentMonth = 11;
                        this.currentYear--;
                    } else {
                        this.currentMonth--;
                    }
                    this.currentDate = new Date(this.currentYear, this.currentMonth, 1);

                    this.networkErrorCount = Math.max(0, this.networkErrorCount - 1);
                    return true;
                }
                return false;
            } catch (e) {
                this.networkErrorCount++;
                return false;
            }
        },

        restartFromFirstMonth() {
            this.currentMonthInRange = 0;
            console.log('🔄 Restarting from first month');

            if (this.settings.dateRangeEnabled && this.targetStartMonth !== null) {
                this.navigateToStartMonth();
            } else {
                let monthsToGoBack = this.totalMonthsInRange - 1;
                this.navigateBackward(monthsToGoBack);
            }
        },

        stopContinuousSlotMonitoring() {
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }
            this.continuousMonitoring = false;
            console.log('⏹️ Stopped slot monitoring');
        }
    };

    /************* UI WITH SETTINGS PANEL *************/
    const QVCUI = {
        clients: [],
        selectedClientId: null,
        isMinimized: false,
        showAllClients: false,
        showSettings: false,

        init() {
            console.log('🎨 Initializing QVC UI v24.7.0 with Settings...');
            this.loadClients();
            this.renderUI();
            this.bindEvents();
            this.makeDraggable();
        },

        loadClients() {
            try {
                const stored = GM_getValue('qvc_clients', []);
                this.clients = Array.isArray(stored) ? stored : [];

                const selectedId = GM_getValue('qvc_selected_client', null);
                if (selectedId && this.clients.find(c => c.id === selectedId)) {
                    this.selectedClientId = selectedId;
                } else if (this.clients.length > 0) {
                    this.selectedClientId = this.clients[0].id;
                }
            } catch (e) {
                this.clients = [];
            }
        },

        saveClients() {
            try {
                GM_setValue('qvc_clients', this.clients);
                if (this.selectedClientId) {
                    GM_setValue('qvc_selected_client', this.selectedClientId);
                }
            } catch (e) {}
        },

        getCurrentClient() {
            return this.clients.find(c => c.id === this.selectedClientId);
        },

        moveClientToTop(clientId) {
            try {
                const index = this.clients.findIndex(c => c.id === clientId);
                if (index > 0) {
                    const client = this.clients.splice(index, 1)[0];
                    this.clients.unshift(client);
                    this.saveClients();
                }
            } catch (e) {}
        },

        renderUI() {
            try {
                const existing = document.getElementById('qvc-pro-ui');
                if (existing) existing.remove();

                const currentClient = this.getCurrentClient();
                const muteIcon = QVCAuto.isMuted ? '🔇' : '🔊';
                const automationStatus = QVCAuto.isAutomationRunning ? '▶️ RUNNING' : '⏸️ STOPPED';
                const automationColor = QVCAuto.isAutomationRunning ? '#4caf50' : '#ff9800';

                const formatDateForInput = (date) => {
                    if (!date) return '';
                    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                };

                const dateRangeStatus = QVCAuto.dateRangeApplied ?
                    `✅ ${QVCAuto.startDate.toLocaleDateString()} - ${QVCAuto.endDate.toLocaleDateString()}` :
                    '❌ Not Set';

                const html = `
                <div id="qvc-pro-ui" style="position:fixed;top:20px;right:20px;width:320px;z-index:10000;background:linear-gradient(135deg, #1a237e, #283593);color:#fff;border:2px solid #5c6bc0;border-radius:12px;font-family:'Segoe UI', Arial;box-shadow:0 8px 25px rgba(0,0,0,0.5);">
                    <div id="qvc-header" style="padding:8px 10px;background:rgba(0,0,0,0.4);cursor:move;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #5c6bc0;">
                        <b style="font-size:12px;">QVC ULTIMATE v24.7.0</b>
                        <div style="display:flex;gap:4px;">
                            <button id="settingsBtn" title="Settings" style="background:#673ab7;border:none;color:#fff;border-radius:4px;cursor:pointer;padding:2px 6px;font-size:12px;">⚙️</button>
                            <button id="muteToggle" title="${QVCAuto.isMuted ? 'Unmute' : 'Mute'}" style="background:#9c27b0;border:none;color:#fff;border-radius:4px;cursor:pointer;padding:2px 6px;font-size:12px;">${muteIcon}</button>
                            <button id="minimizeUI" style="background:#ff9800;border:none;color:#fff;border-radius:4px;cursor:pointer;padding:2px 6px;font-size:10px;">−</button>
                            <button id="closeUI" style="background:#e53935;border:none;color:#fff;border-radius:4px;cursor:pointer;padding:2px 6px;font-size:10px;">×</button>
                        </div>
                    </div>

                    <div id="qvc-settings-panel" style="padding:12px;background:rgba(0,0,0,0.3);border-bottom:1px solid #5c6bc0;${this.showSettings ? '' : 'display:none;'}">
                        <div style="font-size:11px;font-weight:bold;margin-bottom:8px;text-align:center;color:#fff;">⚙️ BOT SETTINGS</div>

                        <div style="margin-bottom:8px;">
                            <label style="font-size:10px;display:block;margin-bottom:3px;">🚀 Bot Speed:</label>
                            <select id="botSpeed" style="width:100%;padding:5px;background:rgba(20,0,61,0.95);border:1px solid #5c6bc0;border-radius:5px;color:#fff;font-size:10px;">
                                <option value="slow" ${QVCAuto.settings.botSpeed === 'slow' ? 'selected' : ''}>🐢 Slow (Safe)</option>
                                <option value="normal" ${QVCAuto.settings.botSpeed === 'normal' ? 'selected' : ''}>⚡ Normal</option>
                                <option value="fast" ${QVCAuto.settings.botSpeed === 'fast' ? 'selected' : ''}>🚀 Fast</option>
                                <option value="ultrafast" ${QVCAuto.settings.botSpeed === 'ultrafast' ? 'selected' : ''}>⚡⚡ Ultra Fast</option>
                            </select>
                        </div>

                        <div style="margin-bottom:8px;">
                            <label style="font-size:10px;display:flex;align-items:center;cursor:pointer;">
                                <input type="checkbox" id="soundEnabled" ${QVCAuto.settings.soundEnabled ? 'checked' : ''} style="margin-right:5px;">
                                🔊 Sound Alerts
                            </label>
                        </div>

                        <div style="margin-bottom:8px;">
                            <label style="font-size:10px;display:flex;align-items:center;cursor:pointer;">
                                <input type="checkbox" id="stealthMode" ${QVCAuto.settings.stealthMode ? 'checked' : ''} style="margin-right:5px;">
                                🥷 Stealth Mode
                            </label>
                        </div>

                        <div style="margin-bottom:8px;">
                            <label style="font-size:10px;display:flex;align-items:center;cursor:pointer;">
                                <input type="checkbox" id="autoClickNext" ${QVCAuto.settings.autoClickNext ? 'checked' : ''} style="margin-right:5px;">
                                ➡️ Auto Click Next
                            </label>
                        </div>

                        <div style="margin-bottom:8px;">
                            <label style="font-size:10px;display:flex;align-items:center;cursor:pointer;">
                                <input type="checkbox" id="autoClickConfirm" ${QVCAuto.settings.autoClickConfirm ? 'checked' : ''} style="margin-right:5px;">
                                ✅ Auto Click Confirm
                            </label>
                        </div>

                        <div style="margin-bottom:8px;">
                            <label style="font-size:10px;display:block;margin-bottom:3px;">🔄 Month Navigation Speed (ms):</label>
                            <input type="number" id="monthNavSpeed" value="${QVCAuto.settings.monthNavigationSpeed}" min="100" max="5000" step="100" style="width:100%;padding:5px;background:rgba(20,0,61,0.95);border:1px solid #5c6bc0;border-radius:5px;color:#fff;font-size:10px;">
                        </div>

                        <div style="margin-bottom:8px;">
                            <label style="font-size:10px;display:block;margin-bottom:3px;">🎯 Slot Check Speed (ms):</label>
                            <input type="number" id="slotCheckSpeed" value="${QVCAuto.settings.slotCheckInterval}" min="100" max="5000" step="100" style="width:100%;padding:5px;background:rgba(20,0,61,0.95);border:1px solid #5c6bc0;border-radius:5px;color:#fff;font-size:10px;">
                        </div>

                        <button id="saveSettings" style="width:100%;padding:6px;background:linear-gradient(45deg, #4caf50, #66bb6a);border:none;border-radius:6px;color:#fff;font-weight:600;font-size:10px;cursor:pointer;">💾 SAVE SETTINGS</button>
                    </div>

                    <div id="qvc-content" style="padding:12px;background:rgba(0,0,0,0.3);${this.isMinimized ? 'display:none;' : ''}">
                        <!-- AUTOMATION CONTROL SECTION -->
                        <div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;margin-bottom:8px;border:1px solid ${automationColor};">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <div id="automationStatus" style="font-size:11px;font-weight:bold;color:${automationColor};">${automationStatus}</div>
                                <div style="display:flex;gap:4px;">
                                    <button id="startAutomation" class="qvc-btn-tiny" style="background:linear-gradient(45deg, #4caf50, #66bb6a);${QVCAuto.isAutomationRunning ? 'display:none;' : ''}">▶️ Start</button>
                                    <button id="stopAutomation" class="qvc-btn-tiny" style="background:linear-gradient(45deg, #ff9800, #ffb74d);${!QVCAuto.isAutomationRunning ? 'display:none;' : ''}">⏸️ Stop</button>
                                </div>
                            </div>
                        </div>

                        <div style="background:rgba(76, 175, 80, 0.2);padding:8px;border-radius:6px;margin-bottom:8px;border:1px solid #4caf50;">
                            <div style="font-size:10px;color:rgba(255,255,255,0.8);margin-bottom:2px;">🎯 SELECTED CLIENT:</div>
                            <div style="font-size:11px;font-weight:bold;color:#4caf50;" id="currentClientInfo">
                                ${currentClient ? `${currentClient.name} - ${currentClient.passport}` : 'No Client'}
                            </div>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
                            <input id="nameInput" placeholder="Name" class="qvc-inp-small">
                            <input id="passportInput" placeholder="Passport *" class="qvc-inp-small">
                            <input id="visaInput" placeholder="Visa *" class="qvc-inp-small">
                            <input id="mobileInput" placeholder="Mobile" class="qvc-inp-small">
                            <input id="emailInput" placeholder="Email" class="qvc-inp-small" style="grid-column:1 / span 2;">
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
                            <button id="addClient" class="qvc-btn-small" style="background:linear-gradient(45deg, #00c853, #00e676);">➕ Add</button>
                            <button id="fillClient" class="qvc-btn-small" style="background:linear-gradient(45deg, #ff9100, #ffab40);">🪄 Fill</button>
                        </div>

                        <div style="background:rgba(255,255,255,0.05);border-radius:6px;padding:8px;margin-bottom:8px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <div style="font-size:11px;font-weight:bold;color:#fff;">📅 DATE RANGE</div>
                                <button id="toggleDateRange" class="qvc-btn-tiny">${QVCAuto.settings.dateRangeEnabled ? '▲' : '▼'}</button>
                            </div>
                            <div style="font-size:9px;color:rgba(255,255,255,0.7);margin-bottom:4px;text-align:center;">
                                ${dateRangeStatus}
                            </div>
                            <div id="dateRangeOptions" style="${QVCAuto.settings.dateRangeEnabled ? '' : 'display:none;'}">
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:4px;">
                                    <div style="font-size:9px;color:rgba(255,255,255,0.7);">Start:</div>
                                    <div style="font-size:9px;color:rgba(255,255,255,0.7);">End:</div>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:4px;">
                                    <input id="startDateInput" type="date" class="qvc-inp-small" style="padding:4px;font-size:9px;" value="${formatDateForInput(QVCAuto.startDate)}">
                                    <input id="endDateInput" type="date" class="qvc-inp-small" style="padding:4px;font-size:9px;" value="${formatDateForInput(QVCAuto.endDate)}">
                                </div>
                                <button id="applyDateRange" class="qvc-btn-small" style="background:linear-gradient(45deg, #3f51b5, #5c6bc0);font-size:9px;padding:4px 8px;">Apply Range</button>
                            </div>
                        </div>

                        <div style="background:rgba(255,255,255,0.05);border-radius:6px;padding:8px;margin-bottom:8px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <div style="font-size:11px;font-weight:bold;color:#fff;">👥 CLIENTS (${this.clients.length})</div>
                                <button id="toggleClients" class="qvc-btn-tiny">${this.showAllClients ? '▲' : '▼'}</button>
                            </div>
                            <div id="clientsList" style="max-height:120px;overflow-y:auto;${this.showAllClients ? '' : 'display:none;'}">
                                ${this.renderClientsList()}
                            </div>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
                            <button id="bookBtn" class="qvc-btn-small" style="background:linear-gradient(45deg, #2196f3, #42a5f5);">📘 Book</button>
                            <button id="rescheduleBtn" class="qvc-btn-small" style="background:linear-gradient(45deg, #ff9800, #ffb74d);">🔄 Reschedule</button>
                        </div>

                        <div style="text-align:center;padding:6px;background:rgba(0,0,0,0.2);border-radius:4px;">
                            <div style="font-size:9px;color:rgba(255,255,255,0.5);font-weight:600;">© 2025 MK TECH</div>
                        </div>
                    </div>
                </div>`;

                document.body.insertAdjacentHTML('beforeend', html);
                this.injectStyles();
            } catch (e) {
                console.error('Error rendering UI:', e);
            }
        },

        renderClientsList() {
            if (this.clients.length === 0) {
                return '<div style="color:rgba(255,255,255,0.5);font-size:10px;text-align:center;padding:15px;">No clients</div>';
            }

            return this.clients.map((client, index) => `
                <div class="clientRow ${client.id === this.selectedClientId ? 'active' : ''}" data-client-id="${client.id}">
                    <div class="clientNumber">#${index + 1}</div>
                    <div class="clientCheckbox">${client.id === this.selectedClientId ? '✓' : ''}</div>
                    <div class="clientInfo">
                        <div class="clientName">${client.name || 'Unnamed'}</div>
                        <div class="clientDetails">📘 ${client.passport} | 📋 ${client.visa}</div>
                    </div>
                    <div class="clientActions">
                        <button class="clientBtn editBtn" data-action="edit" data-client-id="${client.id}">✏️</button>
                        <button class="clientBtn delBtn" data-action="delete" data-client-id="${client.id}">🗑️</button>
                    </div>
                </div>
            `).join('');
        },

        updateMuteButton() {
            const muteBtn = document.getElementById('muteToggle');
            if (muteBtn) {
                muteBtn.textContent = QVCAuto.isMuted ? '🔇' : '🔊';
                muteBtn.title = QVCAuto.isMuted ? 'Unmute' : 'Mute';
            }
        },

        // NEW: Update automation status display
        updateAutomationStatus(isRunning) {
            try {
                const statusDiv = document.getElementById('automationStatus');
                const startBtn = document.getElementById('startAutomation');
                const stopBtn = document.getElementById('stopAutomation');

                if (statusDiv) {
                    const icon = isRunning ? '▶️' : '⏸️';
                    const text = isRunning ? 'RUNNING' : 'STOPPED';
                    const color = isRunning ? '#4caf50' : '#ff9800';
                    statusDiv.innerHTML = `${icon} ${text}`;
                    statusDiv.style.color = color;

                    // Update the automation control section border color
                    const automationSection = statusDiv.closest('div');
                    if (automationSection) {
                        automationSection.style.borderColor = color;
                    }
                }

                if (startBtn) startBtn.style.display = isRunning ? 'none' : 'block';
                if (stopBtn) stopBtn.style.display = isRunning ? 'block' : 'none';
            } catch (e) {
                console.error('Error updating automation status:', e);
            }
        },

        injectStyles() {
            const existingStyle = document.getElementById('qvc-custom-styles');
            if (existingStyle) existingStyle.remove();

            const css = `
                .qvc-inp-small {
                    width: 100%;
                    padding: 6px 8px;
                    background: rgba(20, 0, 61, 0.95);
                    border: 1px solid #5c6bc0;
                    border-radius: 6px;
                    color: #fff;
                    font-size: 10px;
                }
                .qvc-inp-small::placeholder { color: rgba(255,255,255,0.6); }
                .qvc-inp-small:focus {
                    outline: none;
                    border-color: #fff;
                    background: rgba(255,255,255,0.15);
                }
                .qvc-btn-small {
                    padding: 6px 4px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    color: #fff;
                    font-weight: 600;
                    font-size: 10px;
                }
                .qvc-btn-small:hover { transform: translateY(-2px); opacity: 0.9; }
                .qvc-btn-tiny {
                    padding: 4px 6px;
                    border: 1px solid #5c6bc0;
                    border-radius: 5px;
                    cursor: pointer;
                    color: #fff;
                    font-size: 9px;
                    background: rgba(255,255,255,0.1);
                }
                .clientRow {
                    display: flex;
                    align-items: center;
                    padding: 6px;
                    margin-bottom: 4px;
                    background: rgba(20, 0, 61, 0.95);
                    border-radius: 6px;
                    cursor: pointer;
                }
                .clientRow:hover { background: rgba(92, 107, 192, 0.3); }
                .clientRow.active { background: rgba(76, 175, 80, 0.25); border: 1px solid #4caf50; }
                .clientNumber {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: rgba(92, 107, 192, 0.3);
                    border: 1px solid #5c6bc0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 9px;
                    font-weight: 700;
                    margin-right: 4px;
                }
                .clientRow.active .clientNumber { background: #4caf50; border-color: #4caf50; }
                .clientCheckbox {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    border: 1px solid #5c6bc0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8px;
                    margin-right: 6px;
                }
                .clientRow.active .clientCheckbox { background: #4caf50; color: white; }
                .clientInfo { flex: 1; font-size: 10px; }
                .clientName { font-weight: 600; margin-bottom: 2px; }
                .clientDetails { color: rgba(255, 255, 255, 0.95); font-size: 9px; }
                .clientActions { display: flex; gap: 4px; }
                .clientBtn {
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 10px;
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 4px;
                }
                .clientBtn:hover { background: rgba(0, 200, 83, 0.3); }
                .delBtn:hover { background: rgba(239, 83, 80, 0.3); }
                #clientsList::-webkit-scrollbar { width: 4px; }
                #clientsList::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); }
                #clientsList::-webkit-scrollbar-thumb { background: #5c6bc0; }
            `;

            const style = document.createElement('style');
            style.id = 'qvc-custom-styles';
            style.textContent = css;
            document.head.appendChild(style);
        },

        bindEvents() {
            const ui = document.getElementById('qvc-pro-ui');
            if (!ui) return;

            ui.addEventListener('click', (e) => {
                const target = e.target;

                const clientRow = target.closest('.clientRow');
                if (clientRow && !target.closest('.clientBtn')) {
                    this.selectClient(clientRow.dataset.clientId);
                    return;
                }

                if (target.closest('.editBtn')) {
                    e.stopPropagation();
                    this.handleEditClient(target.closest('.editBtn').dataset.clientId);
                    return;
                }

                if (target.closest('.delBtn')) {
                    e.stopPropagation();
                    this.handleDeleteClient(target.closest('.delBtn').dataset.clientId);
                    return;
                }

                switch(target.id) {
                    case 'stopAutomation':
                        QVCAuto.stopAutomation();
                        break;
                    case 'startAutomation':
                        QVCAuto.startAutomation();
                        break;
                    case 'settingsBtn':
                        this.showSettings = !this.showSettings;
                        const settingsPanel = document.getElementById('qvc-settings-panel');
                        if (settingsPanel) {
                            settingsPanel.style.display = this.showSettings ? 'block' : 'none';
                        }
                        break;
                    case 'saveSettings':
                        this.handleSaveSettings();
                        break;
                    case 'addClient':
                        this.handleAddClient();
                        break;
                    case 'fillClient':
                        QVCAuto.manualFillFields();
                        break;
                    case 'muteToggle':
                        QVCAuto.toggleMute();
                        break;
                    case 'toggleClients':
                        this.showAllClients = !this.showAllClients;
                        const list = document.getElementById('clientsList');
                        if (list) {
                            list.style.display = this.showAllClients ? 'block' : 'none';
                            target.textContent = this.showAllClients ? '▲' : '▼';
                        }
                        break;
                    case 'toggleDateRange':
                        QVCAuto.settings.dateRangeEnabled = !QVCAuto.settings.dateRangeEnabled;
                        const options = document.getElementById('dateRangeOptions');
                        if (options) {
                            options.style.display = QVCAuto.settings.dateRangeEnabled ? 'block' : 'none';
                            target.textContent = QVCAuto.settings.dateRangeEnabled ? '▲' : '▼';
                        }
                        QVCAuto.saveSettings();
                        break;
                    case 'applyDateRange':
                        this.handleApplyDateRange();
                        break;
                    case 'bookBtn':
                        QVCAuto.isRescheduleMode = false;
                        window.location.href = 'https://www.qatarvisacenter.com/schedule';
                        break;
                    case 'rescheduleBtn':
                        QVCAuto.isRescheduleMode = true;
                        window.location.href = 'https://www.qatarvisacenter.com/manage';
                        break;
                    case 'minimizeUI':
                        this.isMinimized = !this.isMinimized;
                        const content = document.getElementById('qvc-content');
                        if (content) {
                            content.style.display = this.isMinimized ? 'none' : 'block';
                            target.textContent = this.isMinimized ? '+' : '−';
                        }
                        break;
                    case 'closeUI':
                        ui.remove();
                        this.showNotification('UI closed - refresh to show', 'warning');
                        break;
                }
            });
        },

        handleSaveSettings() {
            try {
                const botSpeed = document.getElementById('botSpeed')?.value;
                const soundEnabled = document.getElementById('soundEnabled')?.checked;
                const stealthMode = document.getElementById('stealthMode')?.checked;
                const autoClickNext = document.getElementById('autoClickNext')?.checked;
                const autoClickConfirm = document.getElementById('autoClickConfirm')?.checked;
                const monthNavSpeed = parseInt(document.getElementById('monthNavSpeed')?.value);
                const slotCheckSpeed = parseInt(document.getElementById('slotCheckSpeed')?.value);

                if (botSpeed) QVCAuto.settings.botSpeed = botSpeed;
                if (soundEnabled !== undefined) QVCAuto.settings.soundEnabled = soundEnabled;
                if (stealthMode !== undefined) QVCAuto.settings.stealthMode = stealthMode;
                if (autoClickNext !== undefined) QVCAuto.settings.autoClickNext = autoClickNext;
                if (autoClickConfirm !== undefined) QVCAuto.settings.autoClickConfirm = autoClickConfirm;
                if (monthNavSpeed) QVCAuto.settings.monthNavigationSpeed = monthNavSpeed;
                if (slotCheckSpeed) QVCAuto.settings.slotCheckInterval = slotCheckSpeed;

                QVCAuto.saveSettings();
                this.showNotification('✅ Settings saved successfully!', 'success');
            } catch (e) {
                this.showNotification('❌ Error saving settings!', 'error');
            }
        },

        handleApplyDateRange() {
            try {
                const startDateInput = document.getElementById('startDateInput');
                const endDateInput = document.getElementById('endDateInput');

                if (!startDateInput?.value || !endDateInput?.value) {
                    this.showNotification('❌ Please select both dates!', 'error');
                    return;
                }

                const startDate = new Date(startDateInput.value);
                const endDate = new Date(endDateInput.value);

                if (startDate > endDate) {
                    this.showNotification('❌ Start date must be before end date!', 'error');
                    return;
                }

                QVCAuto.startDate = startDate;
                QVCAuto.endDate = endDate;
                const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                                  (endDate.getMonth() - startDate.getMonth()) + 1;

                QVCAuto.monthsToMonitor = monthsDiff;
                QVCAuto.saveDateRange();

                this.showNotification(`✅ Range set: ${monthsDiff} months`, 'success');
                this.renderUI();
            } catch (e) {
                this.showNotification('❌ Error applying date range!', 'error');
            }
        },

        handleAddClient() {
            try {
                const passportInput = document.getElementById('passportInput');
                const visaInput = document.getElementById('visaInput');
                const nameInput = document.getElementById('nameInput');
                const mobileInput = document.getElementById('mobileInput');
                const emailInput = document.getElementById('emailInput');

                const passport = passportInput?.value.trim().toUpperCase();
                const visa = visaInput?.value.trim();
                const name = nameInput?.value.trim();
                const mobile = mobileInput?.value.trim();
                const email = emailInput?.value.trim();

                if (!passport || !visa) {
                    this.showNotification('❌ Passport & Visa required!', 'error');
                    return;
                }

                let existingClient = this.clients.find(c => c.passport === passport);

                if (existingClient) {
                    existingClient.name = name || 'Unnamed';
                    existingClient.visa = visa;
                    existingClient.mobile = mobile;
                    existingClient.email = email;
                    this.showNotification(`✅ ${existingClient.name} updated!`, 'success');
                } else {
                    const newClient = {
                        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                        name: name || 'Unnamed',
                        passport,
                        visa,
                        mobile,
                        email
                    };
                    this.clients.push(newClient);
                    this.selectedClientId = newClient.id;
                    this.moveClientToTop(newClient.id);
                    this.showNotification(`✅ ${newClient.name} added!`, 'success');
                }

                this.saveClients();
                this.refreshClientList();

                if (passportInput) passportInput.value = '';
                if (visaInput) visaInput.value = '';
                if (nameInput) nameInput.value = '';
                if (mobileInput) mobileInput.value = '';
                if (emailInput) emailInput.value = '';

            } catch (e) {
                this.showNotification('❌ Error adding client!', 'error');
            }
        },

        handleEditClient(clientId) {
            const client = this.clients.find(c => c.id === clientId);
            if (client) {
                const nameInput = document.getElementById('nameInput');
                const passportInput = document.getElementById('passportInput');
                const visaInput = document.getElementById('visaInput');
                const mobileInput = document.getElementById('mobileInput');
                const emailInput = document.getElementById('emailInput');

                if (nameInput) nameInput.value = client.name || '';
                if (passportInput) passportInput.value = client.passport || '';
                if (visaInput) visaInput.value = client.visa || '';
                if (mobileInput) mobileInput.value = client.mobile || '';
                if (emailInput) emailInput.value = client.email || '';

                this.selectedClientId = clientId;
                this.moveClientToTop(clientId);
                this.refreshClientList();
                this.showNotification(`📝 Editing: ${client.name}`, 'info');
            }
        },

        handleDeleteClient(clientId) {
            const client = this.clients.find(c => c.id === clientId);
            if (confirm(`Delete "${client?.name || 'Client'}"?`)) {
                this.clients = this.clients.filter(c => c.id !== clientId);
                if (this.selectedClientId === clientId) {
                    this.selectedClientId = this.clients.length > 0 ? this.clients[0].id : null;
                }
                this.saveClients();
                this.refreshClientList();
                this.showNotification(`🗑️ Deleted: ${client?.name}`, 'info');
            }
        },

        selectClient(clientId) {
            this.selectedClientId = clientId;
            this.moveClientToTop(clientId);
            this.saveClients();
            this.refreshClientList();
            const client = this.getCurrentClient();
            if (client) {
                this.showNotification(`✅ Selected: ${client.name}`, 'success');
            }
        },

        refreshClientList() {
            const list = document.getElementById('clientsList');
            const currentInfo = document.getElementById('currentClientInfo');
            if (!list || !currentInfo) return;

            list.innerHTML = this.renderClientsList();

            const currentClient = this.getCurrentClient();
            currentInfo.textContent = currentClient ?
                `${currentClient.name} - ${currentClient.passport}` :
                'No Client';
        },

        makeDraggable() {
            const panel = document.getElementById('qvc-pro-ui');
            const header = document.getElementById('qvc-header');
            if (!panel || !header) return;

            let isDragging = false;
            let startX, startY, initialX, initialY;

            header.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initialX = panel.offsetLeft;
                initialY = panel.offsetTop;

                document.addEventListener('mousemove', drag);
                document.addEventListener('mouseup', stopDrag);
            });

            function drag(e) {
                if (!isDragging) return;
                e.preventDefault();

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                panel.style.left = (initialX + dx) + 'px';
                panel.style.top = (initialY + dy) + 'px';
                panel.style.right = 'auto';
            }

            function stopDrag() {
                isDragging = false;
                document.removeEventListener('mousemove', drag);
                document.removeEventListener('mouseup', stopDrag);
            }
        },

        showNotification(message, type = 'info', duration = 3000) {
            try {
                const existing = document.getElementById('qvc-notification');
                if (existing) existing.remove();

                const notification = document.createElement('div');
                notification.id = 'qvc-notification';

                let bgColor = 'linear-gradient(45deg, #2196f3, #42a5f5)';
                if (type === 'success') bgColor = 'linear-gradient(45deg, #4caf50, #66bb6a)';
                else if (type === 'error') bgColor = 'linear-gradient(45deg, #f44336, #ef5350)';
                else if (type === 'warning') bgColor = 'linear-gradient(45deg, #ff9800, #ffb74d)';

                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: ${bgColor};
                    color: white;
                    padding: 10px 15px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 12px;
                    z-index: 10001;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                `;
                notification.textContent = message;

                document.body.appendChild(notification);

                if (duration > 0) {
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, duration);
                }
            } catch (e) {
                console.error('Error showing notification:', e);
            }
        }
    };

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            try {
                QVCAuto.init();
            } catch (e) {
                console.error('Error initializing script:', e);
            }
        });
    } else {
        try {
            QVCAuto.init();
        } catch (e) {
            console.error('Error initializing script:', e);
        }
    }
})();