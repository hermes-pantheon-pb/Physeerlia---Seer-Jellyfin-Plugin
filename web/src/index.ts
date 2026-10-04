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
     * Accurately infers color, border-radius, padding, and bounding dimensions from neighboring toolbar icons.
     */
    function syncButtonTheme(btn: HTMLElement, refBtn: HTMLElement | null) {
        if (!btn) return;

        if (isSeerOpen) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }

        // Safely inspect reference button or neighboring icons for any explicit theme styling
        try {
            const ref = refBtn || document.querySelector('header a.MuiIconButton-colorInherit, header button.MuiIconButton-colorInherit, .headerRight .headerButton');
            if (ref) {
                const comp = window.getComputedStyle(ref);
                const color = comp.color;
                if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
                    btn.style.setProperty('--seer-inferred-color', color);
                }
                if (comp.borderRadius && comp.borderRadius !== '0px') {
                    btn.style.setProperty('--seer-inferred-radius', comp.borderRadius);
                }
                if (comp.padding) {
                    btn.style.setProperty('--seer-inferred-padding', comp.padding);
                }
                // Check if reference button has specific bounding dimensions (e.g. oval / rectangle)
                // and mirror them to maintain exact visual parity across themes
                const refRect = ref.getBoundingClientRect();
                if (refRect.width > 0 && refRect.height > 0) {
                    btn.style.setProperty('--seer-inferred-width', `${Math.round(refRect.width)}px`);
                    btn.style.setProperty('--seer-inferred-height', `${Math.round(refRect.height)}px`);
                }
            }
        } catch (e) {
            console.debug('[SeerPlugin] syncButtonTheme safe fallback', e);
        }

        // Clean up direct inline overrides so the CSS variables take full control
        btn.style.removeProperty('color');
        btn.style.removeProperty('opacity');
    }

    function getHeaderOffset(): number {
        // Measure primary toolbar rather than extended 8em gradient masks from themes like Abyss
        const primaryBar = document.querySelector('header .MuiToolbar-root:first-of-type, .skinHeader .headerTop');
        if (primaryBar) {
            const rect = primaryBar.getBoundingClientRect();
            if (rect.bottom > 0) {
                return Math.ceil(rect.bottom);
            }
        }
        const header = document.querySelector('header, .skinHeader:not([class*="hide"]):not([style*="display: none"])');
        if (header) {
            const rect = header.getBoundingClientRect();
            const height = rect.bottom > 0 ? rect.bottom : rect.height;
            if (height > 0) {
                return Math.min(Math.ceil(height), 72);
            }
        }
        return 64;
    }

    function updateSeerPosition() {
        if (!seerContainer) return;
        const topOffset = getHeaderOffset();
        seerContainer.style.setProperty('--seer-top-offset', `${topOffset}px`);
    }

    function openSeer() {
        document.body.classList.add('seer-active');
        document.documentElement.classList.add('seer-active');

        if (!seerContainer) {
            seerContainer = document.createElement('div');
            seerContainer.id = 'seerPluginRoot';
            seerContainer.className = 'page type-interior seerPageRoot';
            seerContainer.style.position = 'fixed';
            seerContainer.style.top = '0';
            seerContainer.style.left = '0';
            seerContainer.style.right = '0';
            seerContainer.style.bottom = '0';
            seerContainer.style.zIndex = '950';
            seerContainer.style.overflowY = 'auto';
            seerContainer.style.overflowX = 'hidden';
            document.body.appendChild(seerContainer);
        }

        updateSeerPosition();
        window.addEventListener('resize', updateSeerPosition);
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
        document.body.classList.remove('seer-active');
        document.documentElement.classList.remove('seer-active');

        window.removeEventListener('resize', updateSeerPosition);
        if (seerContainer) {
            seerContainer.style.display = 'none';
            ReactDOM.unmountComponentAtNode(seerContainer);
        }
        isSeerOpen = false;

        // Reset button active state & styling
        const btn = document.querySelector('[data-seer-btn="true"]') as HTMLElement;
        const searchBtn = document.querySelector('header a[href*="/search"], header button[aria-label*="Search" i], .headerSearchButton') as HTMLElement;
        if (btn) syncButtonTheme(btn, searchBtn);

        // Remove withBackdrop from native background container if present
        const jfBackground = document.querySelector('.backgroundContainer');
        if (jfBackground) jfBackground.classList.remove('withBackdrop');

        if (revertHistory && window.location.hash === '#seer') {
            window.history.back();
        }
        console.debug('[SeerPlugin] Seer view unmounted');
    }

    const SEER_ICON_SVG = '<svg class="seerHeaderLogoSvg" width="24" height="24" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="pointer-events: none; width: 24px; height: 24px; display: block;"><circle cx="48" cy="48" r="28" fill="currentColor" opacity="0.25"/><path fill-rule="evenodd" clip-rule="evenodd" d="M48 96C74.5097 96 96 74.5097 96 48C96 21.4903 74.5097 0 48 0C21.4903 0 0 21.4903 0 48C0 74.5097 21.4903 96 48 96ZM76.0001 48C76.0001 63.464 63.4641 76 48.0001 76C32.5361 76 20.0001 63.464 20.0001 48C20.0001 45.1303 20.4318 42.3615 21.2338 39.7548C23.4288 44.6165 28.3194 48 34.0001 48C41.7321 48 48.0001 41.732 48.0001 34C48.0001 28.3192 44.6166 23.4287 39.755 21.2337C42.3616 20.4317 45.1304 20 48.0001 20C63.4641 20 76.0001 32.536 76.0001 48Z" fill="currentColor"/></svg>';

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
            btn.className = 'headerButton headerButtonRight headerSeerButton paper-icon-button-light';
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
            const li = document.createElement('li');
            li.setAttribute('data-seer-drawer', 'true');
            li.className = 'MuiListItem-root MuiListItem-gutters';
            li.style.padding = '0';
            li.style.display = 'block';

            const item = document.createElement('div');
            item.setAttribute('data-seer-drawer', 'true');
            item.className = 'MuiButtonBase-root MuiListItemButton-root MuiListItemButton-gutters';
            item.style.cursor = 'pointer';
            item.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openSeer();
                closeActiveDrawers();
            };
            item.innerHTML = `
                <div class="MuiListItemIcon-root" style="min-width: 40px; width: 40px; height: 40px; color: inherit; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    ${SEER_ICON_SVG}
                </div>
                <div class="MuiListItemText-root" style="margin: 0; flex: 1 1 auto;">
                    <span class="MuiTypography-root MuiTypography-body1">Requests & Discovery</span>
                </div>
            `;
            li.appendChild(item);
            modernList.appendChild(li);
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
                closeActiveDrawers();
            };
            link.innerHTML = `<span class="material-icons navMenuOptionIcon" aria-hidden="true" style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; max-width: 24px; max-height: 24px; margin-right: 0.8em; flex-shrink: 0;">${SEER_ICON_SVG}</span><span class="navMenuOptionText">Requests & Discovery</span>`;
            legacyDrawer.appendChild(link);
        }
    }

    function closeActiveDrawers() {
        // 1. Modern MUI Drawer (Dismiss backdrop or dispatch Escape)
        const muiDrawer = document.querySelector('.MuiDrawer-root');
        if (muiDrawer) {
            const backdrop = muiDrawer.querySelector<HTMLElement>('.MuiBackdrop-root') ||
                             document.querySelector<HTMLElement>('.MuiBackdrop-root');
            if (backdrop) {
                try {
                    backdrop.click();
                } catch (e) {
                    console.debug('[SeerPlugin] backdrop click error', e);
                }
            } else {
                try {
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
                } catch (e) {}
            }
        }

        // 2. Legacy Drawer (.tmla-mask or .mainDrawerButton)
        const legacyMask = document.querySelector<HTMLElement>('.tmla-mask:not(.hide)');
        if (legacyMask) {
            try {
                legacyMask.click();
            } catch (e) {}
        }
        const legacyCloseBtn = document.querySelector<HTMLElement>('.mainDrawerButton:not(.hide)');
        const legacyDrawer = document.querySelector('.mainDrawer:not(.hide)');
        if (legacyDrawer && legacyCloseBtn) {
            try {
                legacyCloseBtn.click();
            } catch (e) {}
        }
    }

    // Top Bar & Navigation Click Interception:
    // If the user clicks on Home, Series, Movies, Search, or any other navigation link
    // while Seer is open, close Seer so Jellyfin's requested view renders cleanly.
    document.addEventListener('click', (e) => {
        if (!isSeerOpen) return;
        const target = e.target as HTMLElement;
        if (!target) return;

        // 1. If clicking on our Seer button, drawer link, or inside Seer itself, allow normal handling
        if (
            target.closest('[data-seer-btn="true"]') ||
            target.closest('[data-seer-drawer="true"]') ||
            target.closest('#seerPluginRoot')
        ) {
            return;
        }

        // 2. If clicking on any backdrop, mask, or container background (dismissing overlays), DO NOT close Seer!
        if (
            target.closest('.MuiBackdrop-root') ||
            target.closest('.tmla-mask') ||
            target.classList.contains('MuiBackdrop-root') ||
            target.classList.contains('tmla-mask') ||
            target.classList.contains('MuiModal-root') ||
            target.classList.contains('MuiDrawer-root')
        ) {
            return;
        }

        // 3. Only close Seer if an actual navigation link or header action button was clicked
        const isNavLink = target.closest('a[href]:not([data-seer-drawer="true"])');
        const isHeaderAction = target.closest(
            '.headerSearchButton, ' +
            'header a[href*="/search"], ' +
            'header button[aria-label*="Search" i], ' +
            '.headerUserButton, ' +
            'header button[aria-label*="User" i], ' +
            '.headerCastButton, ' +
            'header button[aria-label*="Cast" i]'
        );
        const isDrawerNavItem = target.closest(
            '.MuiListItemButton-root:not([data-seer-drawer="true"]), ' +
            '.navMenuOption:not([data-seer-drawer="true"])'
        );

        if (isNavLink || isHeaderAction || isDrawerNavItem) {
            console.debug('[SeerPlugin] Navigation click detected away from Seer, closing Seer view');
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
})();

