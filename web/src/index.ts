import React from 'react';
import ReactDOM from 'react-dom';
import { SeerPage } from './SeerPage';
import './styles/seer.scss';

(function initJellyfinSeerPlugin() {
    'use strict';

    console.info('[SeerPlugin] Initializing standalone Jellyfin Seer Plugin...');

    let seerContainer: HTMLElement | null = null;
    let isSeerOpen = false;

    /**
     * Dynamically synchronizes the Seer icon button styling with the active Jellyfin theme.
     * Accurately infers color and active state from neighboring toolbar icons.
     */
    function syncButtonTheme(btn: HTMLElement, refBtn: HTMLElement | null) {
        if (!btn) return;

        if (isSeerOpen) {
            btn.classList.add('active');
            return;
        }

        btn.classList.remove('active');

        // Safely inspect reference button or neighboring icons for any explicit theme colors
        try {
            const ref = refBtn || document.querySelector('header a.MuiIconButton-colorInherit, header button.MuiIconButton-colorInherit, .headerRight .headerButton');
            if (ref) {
                const comp = window.getComputedStyle(ref);
                const color = comp.color;
                if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
                    btn.style.setProperty('--seer-inferred-color', color);
                }
            }
        } catch (e) {
            console.debug('[SeerPlugin] syncButtonTheme safe fallback', e);
        }

        // Clean up direct inline overrides so the CSS variables take full control
        btn.style.removeProperty('color');
        btn.style.removeProperty('opacity');
    }

    function openSeer() {
        const header = document.querySelector('header, .skinHeader:not([class*="hide"]):not([style*="display: none"])');
        const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 48;

        if (!seerContainer) {
            seerContainer = document.createElement('div');
            seerContainer.id = 'seerPluginRoot';
            seerContainer.className = 'page type-interior seerPageRoot';
            seerContainer.style.position = 'fixed';
            seerContainer.style.left = '0';
            seerContainer.style.right = '0';
            seerContainer.style.bottom = '0';
            seerContainer.style.zIndex = '1050';
            seerContainer.style.overflowY = 'auto';
            seerContainer.style.overflowX = 'hidden';
            document.body.appendChild(seerContainer);
        }

        seerContainer.style.top = `${headerHeight}px`;
        seerContainer.style.height = `calc(100vh - ${headerHeight}px)`;
        seerContainer.style.display = 'block';
        isSeerOpen = true;

        // Update button active state & styling
        const btn = document.querySelector('[data-seer-btn="true"]') as HTMLElement;
        const searchBtn = document.querySelector('header a[href*="/search"], header button[aria-label*="Search" i], .headerSearchButton') as HTMLElement;
        if (btn) syncButtonTheme(btn, searchBtn);

        ReactDOM.render(React.createElement(SeerPage, { onClose: () => closeSeer(true) }), seerContainer);

        if (window.location.hash !== '#seer') {
            window.history.pushState({ seerOpen: true }, '', '#seer');
        }

        console.debug('[SeerPlugin] Seer view mounted underneath top bar');
    }

    function closeSeer(revertHistory = true) {
        if (seerContainer) {
            seerContainer.style.display = 'none';
            ReactDOM.unmountComponentAtNode(seerContainer);
        }
        isSeerOpen = false;

        // Reset button active state & styling
        const btn = document.querySelector('[data-seer-btn="true"]') as HTMLElement;
        const searchBtn = document.querySelector('header a[href*="/search"], header button[aria-label*="Search" i]') as HTMLElement;
        if (btn) syncButtonTheme(btn, searchBtn);

        // Remove withBackdrop from native background container if present
        const jfBackground = document.querySelector('.backgroundContainer');
        if (jfBackground) jfBackground.classList.remove('withBackdrop');

        if (revertHistory && window.location.hash === '#seer') {
            window.history.back();
        }
        console.debug('[SeerPlugin] Seer view unmounted');
    }

    const SEER_ICON_SVG = '<svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor; display: block;"><path d="M19.3 16.9c.4-.7.7-1.5.7-2.4 0-2.5-2-4.5-4.5S11 12 11 14.5s2 4.5 4.5 4.5c.9 0 1.7-.3 2.4-.7l3.2 3.2 1.4-1.4zm-3.8.1c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5M12 20v2C6.48 22 2 17.52 2 12S6.48 2 12 2c4.84 0 8.87 3.44 9.8 8h-2.07c-.64-2.46-2.4-4.47-4.73-5.41V5c0 1.1-.9 2-2 2h-2v2c0 .55-.45 1-1 1H8v2h2v3H9l-4.79-4.79C4.08 10.79 4 11.38 4 12c0 4.41 3.59 8 8 8"></path></svg>';

    /**
     * Checks if the active view is within the server administration dashboard.
     */
    function isDashboardView(): boolean {
        const hash = (window.location.hash || '').toLowerCase();
        const path = (window.location.pathname || '').toLowerCase();
        return (
            hash.includes('/dashboard') ||
            path.includes('/dashboard') ||
            hash.includes('configurationpage') ||
            path.includes('configurationpage') ||
            !!document.querySelector('.dashboardPage') ||
            !!document.querySelector('#dashboardPage') ||
            !!document.querySelector('#plugins-subheader') ||
            !!document.querySelector('[aria-labelledby="server-subheader"]') ||
            !!document.querySelector('.dashboardContainer') ||
            !!document.querySelector('#serverConfigurationPage')
        );
    }

    /**
     * Injects the Seer navigation icon into the visible header (Modern or Legacy).
     * Strictly restricted to media library views (never rendered on the admin dashboard).
     */
    function injectNavigation() {
        if (isDashboardView()) {
            // Clean up any stray buttons or drawer items on the admin dashboard
            document.querySelectorAll('[data-seer-btn="true"]').forEach(el => el.remove());
            document.querySelectorAll('[data-seer-drawer="true"]').forEach(el => el.remove());
            return;
        }

        // Modern Layout: Material-UI Toolbar in active header
        const modernToolbar = document.querySelector('header .MuiToolbar-root');
        if (modernToolbar) {
            // Locate the search button in the toolbar
            const searchBtn = modernToolbar.querySelector('a[href*="/search"], a[aria-label*="Search" i], button[aria-label*="Search" i]') as HTMLElement;
            
            // Only inject the top bar button if the regular search button is present in this toolbar.
            if (!searchBtn) {
                document.querySelectorAll('[data-seer-btn="true"]').forEach(el => el.remove());
                injectDrawerLink();
                return;
            }

            const existingBtn = document.querySelector('[data-seer-btn="true"]') as HTMLElement;
            if (existingBtn) {
                if (existingBtn.previousElementSibling === searchBtn) {
                    if (isSeerOpen && !existingBtn.classList.contains('active')) {
                        existingBtn.classList.add('active');
                    } else if (!isSeerOpen && existingBtn.classList.contains('active')) {
                        existingBtn.classList.remove('active');
                    }
                    injectDrawerLink();
                    return;
                }
                existingBtn.remove();
            }

            document.querySelectorAll('[data-seer-btn="true"]').forEach(el => el.remove());

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('data-seer-btn', 'true');
            btn.id = 'headerSeerBtn';
            btn.className = 'seerHeaderMuiBtn MuiButtonBase-root MuiIconButton-root MuiIconButton-colorInherit MuiIconButton-sizeLarge';
            btn.title = 'Requests & Discovery (Seer)';
            btn.setAttribute('aria-label', 'Requests & Discovery (Seer)');
            btn.innerHTML = SEER_ICON_SVG;

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isSeerOpen) {
                    closeSeer(true);
                } else {
                    openSeer();
                }
            };

            searchBtn.insertAdjacentElement('afterend', btn);
            syncButtonTheme(btn, searchBtn);
            injectDrawerLink();
            return;
        }

        // Legacy Header (Default Stock Theme): paper-icon-button-light in .skinHeader .headerRight
        const legacyHeader = document.querySelector('.skinHeader:not([class*="hide"]):not([style*="display: none"]) .headerRight');
        if (legacyHeader) {
            const searchBtn = legacyHeader.querySelector('.headerSearchButton') as HTMLElement;
            if (!searchBtn) {
                document.querySelectorAll('[data-seer-btn="true"]').forEach(el => el.remove());
                injectDrawerLink();
                return;
            }

            const existingBtn = document.querySelector('[data-seer-btn="true"]') as HTMLElement;
            if (existingBtn) {
                if (existingBtn.previousElementSibling === searchBtn) {
                    if (isSeerOpen && !existingBtn.classList.contains('active')) {
                        existingBtn.classList.add('active');
                    } else if (!isSeerOpen && existingBtn.classList.contains('active')) {
                        existingBtn.classList.remove('active');
                    }
                    if (searchBtn.classList.contains('hide')) {
                        existingBtn.classList.add('hide');
                    } else {
                        existingBtn.classList.remove('hide');
                    }
                    injectDrawerLink();
                    return;
                }
                existingBtn.remove();
            }

            document.querySelectorAll('[data-seer-btn="true"]').forEach(el => el.remove());

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('is', 'paper-icon-button-light');
            btn.setAttribute('data-seer-btn', 'true');
            btn.id = 'headerSeerBtn';
            btn.className = 'headerButton headerButtonRight headerButton-plantitle headerSeerButton paper-icon-button-light';
            btn.title = 'Requests & Discovery (Seer)';
            btn.setAttribute('aria-label', 'Requests & Discovery (Seer)');
            btn.innerHTML = `<span class="material-icons" aria-hidden="true" style="display: inline-flex; align-items: center; justify-content: center; width: 1.5em; height: 1.5em;">${SEER_ICON_SVG}</span>`;

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isSeerOpen) {
                    closeSeer(true);
                } else {
                    openSeer();
                }
            };

            searchBtn.insertAdjacentElement('afterend', btn);
            if (searchBtn.classList.contains('hide')) {
                btn.classList.add('hide');
            }
            syncButtonTheme(btn, searchBtn);
            injectDrawerLink();
            return;
        }

        injectDrawerLink();
    }

    function injectDrawerLink() {
        if (isDashboardView()) {
            document.querySelectorAll('[data-seer-drawer="true"]').forEach(el => el.remove());
            return;
        }

        if (document.querySelector('[data-seer-drawer="true"]')) {
            return;
        }

        // Modern Drawer List: ONLY target the main media app drawer containing the Home link
        const homeLink = document.querySelector('.MuiDrawer-root a[href*="/home"], nav a[href*="/home"]');
        const modernList = homeLink?.closest('.MuiList-root');
        if (modernList) {
            const item = document.createElement('div');
            item.setAttribute('data-seer-drawer', 'true');
            item.className = 'MuiButtonBase-root MuiListItemButton-root MuiListItemButton-gutters';
            item.style.cursor = 'pointer';
            item.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openSeer();
            };
            item.innerHTML = `
                <div class="MuiListItemIcon-root" style="min-width: 40px; color: inherit;">
                    ${SEER_ICON_SVG}
                </div>
                <div class="MuiListItemText-root">
                    <span class="MuiTypography-root MuiTypography-body1">Requests & Discovery</span>
                </div>
            `;
            modernList.appendChild(item);
            return;
        }

        // Legacy Drawer Options: strictly inside the user mainDrawer
        const legacyDrawer = document.querySelector('.mainDrawer .navMenuOptionContainer');
        if (legacyDrawer) {
            const link = document.createElement('a');
            link.setAttribute('data-seer-drawer', 'true');
            link.className = 'navMenuOption lnkMediaFolder lnkSeer';
            link.href = '#';
            link.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openSeer();
            };
            link.innerHTML = `<span class="material-icons navMenuOptionIcon" aria-hidden="true" style="display: inline-flex; align-items: center; justify-content: center; width: 1.5em; height: 1.5em; margin-right: 0.8em;">${SEER_ICON_SVG}</span><span class="navMenuOptionText">Requests & Discovery</span>`;
            legacyDrawer.appendChild(link);
        }
    }

    // Top Bar & Navigation Click Interception:
    // If the user clicks on Home, Series, Movies, Search, or any other header/drawer item
    // while Seer is open, immediately close Seer so Jellyfin's requested view renders cleanly.
    document.addEventListener('click', (e) => {
        if (!isSeerOpen) return;
        const target = e.target as HTMLElement;
        if (!target) return;

        // If clicking on our Seer button or inside the Seer page, let normal handling occur
        if (target.closest('[data-seer-btn="true"]') || target.closest('#seerPluginRoot')) {
            return;
        }

        // If user clicks anywhere on Jellyfin header, toolbar, navigation drawer, or search
        if (
            target.closest('header') ||
            target.closest('.skinHeader') ||
            target.closest('.mainDrawer') ||
            target.closest('.MuiDrawer-root') ||
            target.closest('nav')
        ) {
            console.debug('[SeerPlugin] Navigation click detected in top bar/drawer, closing Seer view');
            closeSeer(false);
        }
    }, true);

    // Track React Router and Browser Navigation:
    function handleNavigationChange() {
        if (!isSeerOpen) return;
        const hash = window.location.hash;
        const path = window.location.pathname;
        if (hash !== '#seer' && !path.endsWith('/seer')) {
            console.debug('[SeerPlugin] Navigation change detected away from Seer, closing view');
            closeSeer(false);
        }
    }

    const origPushState = history.pushState;
    history.pushState = function(...args) {
        origPushState.apply(this, args);
        handleNavigationChange();
    };

    const origReplaceState = history.replaceState;
    history.replaceState = function(...args) {
        origReplaceState.apply(this, args);
        handleNavigationChange();
    };

    window.addEventListener('popstate', handleNavigationChange);
    window.addEventListener('hashchange', handleNavigationChange);

    // Jellyfin native viewshow event
    document.addEventListener('viewshow', (e: any) => {
        if (!isSeerOpen) return;
        const view = e.detail?.element || e.target;
        if (view && (view.id === 'seerPage' || view.closest?.('#seerPluginRoot'))) {
            return;
        }
        console.debug('[SeerPlugin] Jellyfin viewshow event fired, exiting Seer view');
        closeSeer(false);
    });

    // Instantaneous 0ms injection via requestAnimationFrame-debounced MutationObserver
    let rafScheduled = false;
    function scheduleInjectNavigation() {
        if (rafScheduled) return;
        rafScheduled = true;
        requestAnimationFrame(() => {
            rafScheduled = false;
            injectNavigation();
        });
    }

    const observer = new MutationObserver(() => {
        scheduleInjectNavigation();
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
            }
            scheduleInjectNavigation();
        });
    }

    // Immediate initial run
    scheduleInjectNavigation();
    if (window.location.hash === '#seer') {
        setTimeout(openSeer, 300);
    }

    // Heartbeat fallback to catch any async router state transitions
    setInterval(() => {
        if (isSeerOpen && window.location.hash !== '#seer' && !window.location.pathname.endsWith('/seer')) {
            closeSeer(false);
        }
        scheduleInjectNavigation();
    }, 800);
})();

