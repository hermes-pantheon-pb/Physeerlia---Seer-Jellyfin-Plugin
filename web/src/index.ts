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
        if (!seerContainer) {
            seerContainer = document.createElement('div');
            seerContainer.id = 'seerPluginRoot';
            seerContainer.className = 'page type-interior seerPageRoot';
            seerContainer.style.position = 'fixed';
            seerContainer.style.top = '0';
            seerContainer.style.left = '0';
            seerContainer.style.width = '100vw';
            seerContainer.style.height = '100vh';
            seerContainer.style.zIndex = '9999';
            seerContainer.style.backgroundColor = 'var(--jf-palette-background-default, #141414)';
            seerContainer.style.overflowY = 'auto';
            seerContainer.style.overflowX = 'hidden';
            document.body.appendChild(seerContainer);
        }

        seerContainer.style.display = 'block';
        document.body.style.overflow = 'hidden';
        isSeerOpen = true;

        ReactDOM.render(React.createElement(SeerPage, { onClose: closeSeer }), seerContainer);

        // Update URL hash without letting React Router crash on unknown path
        if (window.location.hash !== '#seer') {
            window.history.pushState({ seerOpen: true }, '', '#seer');
        }

        console.debug('[SeerPlugin] Seer full-page view mounted');
    }

    function closeSeer() {
        if (seerContainer) {
            seerContainer.style.display = 'none';
            ReactDOM.unmountComponentAtNode(seerContainer);
        }
        document.body.style.overflow = '';
        isSeerOpen = false;

        // Restore clean URL if hash was #seer
        if (window.location.hash === '#seer') {
            window.history.back();
        }
        console.debug('[SeerPlugin] Seer full-page view unmounted');
    }

    /**
     * Injects the Seer navigation icon into the visible header (Modern or Legacy)
     */
    function injectNavigation() {
        // Prevent duplicate buttons
        if (document.querySelector('[data-seer-btn="true"]')) {
            return;
        }

        // 1. Modern Layout: Material-UI Toolbar in active header
        const modernToolbar = document.querySelector('header .MuiToolbar-root');
        if (modernToolbar) {
            // Find the right-aligned button container (next to search / user button)
            const rightContainer = modernToolbar.querySelector('.MuiBox-root[style*="flex-end"]') ||
                                   modernToolbar.querySelector('button[aria-label*="user" i]')?.parentElement ||
                                   modernToolbar;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('data-seer-btn', 'true');
            btn.className = 'MuiButtonBase-root MuiIconButton-root MuiIconButton-colorInherit MuiIconButton-sizeLarge';
            btn.title = 'Requests & Discovery (Seer)';
            btn.setAttribute('aria-label', 'Requests & Discovery (Seer)');
            btn.style.margin = '0 2px';
            btn.style.cursor = 'pointer';
            btn.innerHTML = '<span class="material-icons travel_explore" aria-hidden="true" style="font-size: 24px; vertical-align: middle;">travel_explore</span>';

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isSeerOpen) {
                    closeSeer();
                } else {
                    openSeer();
                }
            };

            const userMenuBtn = modernToolbar.querySelector('button[aria-label*="user" i]') ||
                                modernToolbar.querySelector('button[aria-label*="account" i]') ||
                                modernToolbar.querySelector('[class*="UserMenuButton"]');

            if (userMenuBtn && userMenuBtn.parentElement) {
                userMenuBtn.parentElement.insertBefore(btn, userMenuBtn);
            } else {
                rightContainer.appendChild(btn);
            }

            console.debug('[SeerPlugin] Injected Seer button into Modern Toolbar');
            injectDrawerLink();
            return; // Never proceed to legacy if modern toolbar was injected
        }

        // 2. Legacy Layout: only if no modern header exists
        const legacyHeader = document.querySelector('.skinHeader:not([class*="hide"]):not([style*="display: none"]) .headerRight');
        if (legacyHeader && !document.querySelector('[data-seer-btn="true"]')) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('data-seer-btn', 'true');
            btn.className = 'headerButton headerButtonRight';
            btn.title = 'Requests & Discovery (Seer)';
            btn.innerHTML = '<span class="material-icons travel_explore" aria-hidden="true" style="font-size: 1.5em; vertical-align: middle;">travel_explore</span>';
            btn.style.display = 'inline-flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.cursor = 'pointer';

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
            console.debug('[SeerPlugin] Injected Seer button into Legacy Header');
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
            console.debug('[SeerPlugin] Injected Seer link into Modern Drawer');
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
            console.debug('[SeerPlugin] Injected Seer link into Legacy Drawer');
        }
    }

    // Handle browser back button
    window.addEventListener('popstate', (e) => {
        if (isSeerOpen) {
            if (seerContainer) {
                seerContainer.style.display = 'none';
                ReactDOM.unmountComponentAtNode(seerContainer);
            }
            document.body.style.overflow = '';
            isSeerOpen = false;
        }
    });

    // Check on startup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectNavigation();
            if (window.location.hash === '#seer') {
                setTimeout(openSeer, 600);
            }
        });
    } else {
        injectNavigation();
        if (window.location.hash === '#seer') {
            setTimeout(openSeer, 600);
        }
    }

    // Keep navigation icon active across React route changes
    setInterval(injectNavigation, 1200);
})();
