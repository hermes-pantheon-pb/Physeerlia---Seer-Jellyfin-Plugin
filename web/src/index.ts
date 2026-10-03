import React from 'react';
import ReactDOM from 'react-dom';
import { SeerPage } from './SeerPage';
import './styles/seer.scss';

(function initJellyfinSeerPlugin() {
    'use strict';

    console.info('[SeerPlugin] Initializing standalone Jellyfin Seer Plugin...');

    let seerContainer: HTMLElement | null = null;
    let isSeerOpen = false;

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

        // Highlight header button when active
        const btn = document.querySelector('[data-seer-btn="true"]');
        if (btn) btn.classList.add('active');

        ReactDOM.render(React.createElement(SeerPage, { onClose: closeSeer }), seerContainer);

        if (window.location.hash !== '#seer') {
            window.history.pushState({ seerOpen: true }, '', '#seer');
        }

        console.debug('[SeerPlugin] Seer view mounted underneath top bar');
    }

    function closeSeer() {
        if (seerContainer) {
            seerContainer.style.display = 'none';
            ReactDOM.unmountComponentAtNode(seerContainer);
        }
        isSeerOpen = false;

        // Unhighlight header button
        const btn = document.querySelector('[data-seer-btn="true"]');
        if (btn) btn.classList.remove('active');

        if (window.location.hash === '#seer') {
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
            const searchBtn = modernToolbar.querySelector('a[href*="/search"], a[aria-label*="Search" i], button[aria-label*="Search" i]');
            const existingBtn = document.querySelector('[data-seer-btn="true"]');

            if (existingBtn) {
                // If it is already in the right place directly after search, nothing to do
                if (searchBtn && existingBtn.previousElementSibling === searchBtn) {
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
            btn.className = 'seerHeaderMuiBtn MuiButtonBase-root MuiIconButton-root MuiIconButton-colorInherit MuiIconButton-sizeLarge';
            if (isSeerOpen) btn.classList.add('active');
            btn.title = 'Requests & Discovery (Seer)';
            btn.setAttribute('aria-label', 'Requests & Discovery (Seer)');

            // Material-UI exact TravelExplore SVG icon
            btn.innerHTML = `
                <svg class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium" focusable="false" aria-hidden="true" viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;">
                    <path d="M19.3 16.9c.4-.7.7-1.5.7-2.4 0-2.5-2-4.5-4.5-4.5s-4.5 2-4.5 4.5 2 4.5 4.5 4.5c.9 0 1.7-.3 2.4-.7l3.2 3.2 1.4-1.4-2.7-3.2zm-3.8.1c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5zM12 20v2C6.48 22 2 17.52 2 12S6.48 2 12 2c4.84 0 8.87 3.44 9.8 8h-2.07c-.64-2.46-2.4-4.43-4.73-5.25v.25c0 1.1-.9 2-2 2h-2v2c0 .55-.45 1-1 1h-2v2h6c.55 0 1 .45 1 1v1.17c-.61.5-1.07 1.16-1.34 1.83H12v2h2c0 .73.16 1.41.43 2.04l-.43.43V20z"></path>
                </svg>
            `;

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isSeerOpen) {
                    closeSeer();
                } else {
                    openSeer();
                }
            };

            if (searchBtn && searchBtn.parentElement) {
                // Insert on the right side of the regular search icon
                searchBtn.insertAdjacentElement('afterend', btn);
            } else {
                // Fallback: inside right buttons container before user menu
                const userBox = modernToolbar.querySelector('button[aria-label*="user" i]')?.closest('.MuiBox-root') ||
                                modernToolbar.querySelector('button[aria-label*="user" i]');
                if (userBox && userBox.parentElement) {
                    userBox.parentElement.insertBefore(btn, userBox);
                } else {
                    modernToolbar.appendChild(btn);
                }
            }

            console.debug('[SeerPlugin] Injected single Seer button on the right side of Search icon');
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
                    closeSeer();
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

    // Handle browser back button
    window.addEventListener('popstate', () => {
        if (isSeerOpen) {
            if (seerContainer) {
                seerContainer.style.display = 'none';
                ReactDOM.unmountComponentAtNode(seerContainer);
            }
            isSeerOpen = false;
            const btn = document.querySelector('[data-seer-btn="true"]');
            if (btn) btn.classList.remove('active');
        }
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

    // Keep navigation icon active across React route changes
    setInterval(injectNavigation, 1000);
})();
