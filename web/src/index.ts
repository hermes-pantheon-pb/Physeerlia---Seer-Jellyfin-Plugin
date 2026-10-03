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
            const ref = refBtn || document.querySelector('header a.MuiIconButton-colorInherit, header button.MuiIconButton-colorInherit');
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
        const header = document.querySelector('header');
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
        const searchBtn = document.querySelector('header a[href*="/search"], header button[aria-label*="Search" i]') as HTMLElement;
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

    /**
     * Injects the Seer navigation icon into the visible header (Modern or Legacy)
     */
    function injectNavigation() {
        // Modern Layout: Material-UI Toolbar in active header
        const modernToolbar = document.querySelector('header .MuiToolbar-root');
        if (modernToolbar) {
            // Locate the search button in the toolbar
            const searchBtn = modernToolbar.querySelector('a[href*="/search"], a[aria-label*="Search" i], button[aria-label*="Search" i]') as HTMLElement;
            const existingBtn = document.querySelector('[data-seer-btn="true"]') as HTMLElement;

            if (existingBtn) {
                // If it is already in the right place directly after search, keep theme synced
                if (searchBtn && existingBtn.previousElementSibling === searchBtn) {
                    syncButtonTheme(existingBtn, searchBtn);
                    return;
                }
                // Otherwise remove misplaced button so it can be re-inserted correctly
                existingBtn.remove();
            }

            // Clean up any stray duplicates
            document.querySelectorAll('[data-seer-btn="true"]').forEach(el => el.remove());

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('data-seer-btn', 'true');
            btn.id = 'headerSeerBtn';

            // Clean Material-UI button classes with Seer styling hook
            btn.className = 'seerHeaderMuiBtn MuiButtonBase-root MuiIconButton-root MuiIconButton-colorInherit MuiIconButton-sizeLarge';

            btn.title = 'Requests & Discovery (Seer)';
            btn.setAttribute('aria-label', 'Requests & Discovery (Seer)');

            // Material-UI exact TravelExplore SVG icon
            btn.innerHTML = '<svg class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium" focusable="false" aria-hidden="true" viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;"><path d="M19.3 16.9c.4-.7.7-1.5.7-2.4 0-2.5-2-4.5-4.5-4.5S11 12 11 14.5s2 4.5 4.5 4.5c.9 0 1.7-.3 2.4-.7l3.2 3.2 1.4-1.4zm-3.8.1c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5M12 20v2C6.48 22 2 17.52 2 12S6.48 2 12 2c4.84 0 8.87 3.44 9.8 8h-2.07c-.64-2.46-2.4-4.47-4.73-5.41V5c0 1.1-.9 2-2 2h-2v2c0 .55-.45 1-1 1H8v2h2v3H9l-4.79-4.79C4.08 10.79 4 11.38 4 12c0 4.41 3.59 8 8 8"></path></svg>';

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isSeerOpen) {
                    closeSeer(true);
                } else {
                    openSeer();
                }
            };

            if (searchBtn && searchBtn.parentElement) {
                // Insert directly on the right side of the regular search icon
                searchBtn.insertAdjacentElement("afterend", btn);
            } else {
                // Fallback: inside right buttons container before user menu
                const userBox = modernToolbar.querySelector('button[aria-label*="user" i]')?.closest(".MuiBox-root") ||
                                modernToolbar.querySelector('button[aria-label*="user" i]');
                if (userBox && userBox.parentElement) {
                    userBox.parentElement.insertBefore(btn, userBox);
                } else {
                    modernToolbar.appendChild(btn);
                }
            }

            syncButtonTheme(btn, searchBtn);

            console.debug('[SeerPlugin] Injected theme-adapted Seer button adjacent to Search icon');
            injectDrawerLink();
            return;
        }

        // Legacy Layout fallback
        const legacyHeader = document.querySelector('.skinHeader:not([class*="hide"]):not([style*="display: none"]) .headerRight');
        if (legacyHeader && !document.querySelector('[data-seer-btn="true"]')) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('data-seer-btn', 'true');
            btn.id = 'headerSeerBtn';
            btn.className = 'headerButton headerButtonRight';
            btn.title = 'Requests & Discovery (Seer)';
            btn.innerHTML = '<span class="material-icons travel_explore" aria-hidden="true" style="font-size: 1.5em; vertical-align: middle;">travel_explore</span>';

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isSeerOpen) {
                    closeSeer(true);
                } else {
                    openSeer();
                }
            };

            const userBtn = legacyHeader.querySelector('.headerUserButton');
            if (userBtn) {
                legacyHeader.insertBefore(btn, userBtn);
            } else {
                legacyHeader.appendChild(btn);
            }
        }

        injectDrawerLink();
    }

    function injectDrawerLink() {
        if (document.querySelector('[data-seer-drawer="true"]')) {
            return;
        }

        // Modern Drawer List
        const modernList = document.querySelector('.MuiDrawer-root .MuiList-root') || document.querySelector('nav .MuiList-root');
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
                    <span class="material-icons travel_explore">travel_explore</span>
                </div>
                <div class="MuiListItemText-root">
                    <span class="MuiTypography-root MuiTypography-body1">Requests & Discovery</span>
                </div>
            `;
            modernList.appendChild(item);
            return;
        }

        // Legacy Drawer Options
        const legacyDrawer = document.querySelector('.mainDrawer .navMenuOptionContainer') || document.querySelector('.navMenuOptionContainer');
        if (legacyDrawer) {
            const link = document.createElement('a');
            link.setAttribute('data-seer-drawer', 'true');
            link.className = 'navMenuOption lnkMediaFolder';
            link.href = '#';
            link.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openSeer();
            };
            link.innerHTML = '<span class="material-icons navMenuOptionIcon travel_explore" aria-hidden="true">travel_explore</span><span class="navMenuOptionText">Requests & Discovery</span>';
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

    // Check on startup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectNavigation();
            if (window.location.hash === '#seer') {
                setTimeout(openSeer, 500);
            }
        });
    } else {
        injectNavigation();
        if (window.location.hash === '#seer') {
            setTimeout(openSeer, 500);
        }
    }

    // Keep navigation icon active and theme-synced across route & DOM changes
    setInterval(() => {
        if (isSeerOpen && window.location.hash !== '#seer' && !window.location.pathname.endsWith('/seer')) {
            closeSeer(false);
        }
        injectNavigation();
    }, 600);
})();

