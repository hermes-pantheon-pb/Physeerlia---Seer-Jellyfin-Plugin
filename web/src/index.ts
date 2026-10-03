import React from 'react';
import ReactDOM from 'react-dom';
import { SeerPage } from './SeerPage';
import './styles/seer.scss';

(function initJellyfinSeerPlugin() {
    'use strict';

    console.info('[SeerPlugin] Initializing standalone Jellyfin Seer Plugin...');

    const SEER_ROUTE = '#/seer';
    let seerContainer: HTMLElement | null = null;

    /**
     * Injects the Seer navigation icon into both Modern and Legacy Jellyfin headers
     */
    function injectNavigation() {
        if (document.getElementById('headerSeerBtn')) {
            return;
        }

        // 1. Modern Layout: Material-UI Toolbar
        const modernToolbar = document.querySelector('header .MuiToolbar-root') || document.querySelector('.MuiToolbar-root');
        if (modernToolbar) {
            const btn = document.createElement('button');
            btn.id = 'headerSeerBtn';
            btn.type = 'button';
            btn.className = 'MuiButtonBase-root MuiIconButton-root MuiIconButton-colorInherit MuiIconButton-sizeLarge';
            btn.title = 'Requests & Discovery (Seer)';
            btn.setAttribute('aria-label', 'Requests & Discovery (Seer)');
            btn.style.margin = '0 4px';
            btn.style.cursor = 'pointer';
            btn.innerHTML = '<span class="material-icons travel_explore" aria-hidden="true" style="font-size: 24px; vertical-align: middle;">travel_explore</span>';

            btn.onclick = (e) => {
                e.preventDefault();
                window.location.hash = '/seer';
            };

            const userMenuBtn = modernToolbar.querySelector('button[aria-label*="user" i]') ||
                                modernToolbar.querySelector('button[aria-label*="account" i]') ||
                                modernToolbar.querySelector('[class*="UserMenuButton"]');

            if (userMenuBtn && userMenuBtn.parentElement) {
                userMenuBtn.parentElement.insertBefore(btn, userMenuBtn);
            } else {
                modernToolbar.appendChild(btn);
            }
            console.debug('[SeerPlugin] Injected Seer button into Modern Toolbar');
        }

        // 2. Legacy Layout: .skinHeader .headerRight
        const legacyHeader = document.querySelector('.skinHeader .headerRight') || document.querySelector('.headerRight');
        if (legacyHeader && !document.getElementById('headerSeerBtn')) {
            const btn = document.createElement('button');
            btn.id = 'headerSeerBtn';
            btn.type = 'button';
            btn.className = 'headerButton headerButtonRight';
            btn.title = 'Requests & Discovery (Seer)';
            btn.innerHTML = '<span class="material-icons travel_explore" aria-hidden="true" style="font-size: 1.5em; vertical-align: middle;">travel_explore</span>';
            btn.style.display = 'inline-flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.cursor = 'pointer';

            btn.onclick = (e) => {
                e.preventDefault();
                window.location.hash = '/seer';
            };

            const userBtn = legacyHeader.querySelector('.headerUserButton');
            if (userBtn) {
                legacyHeader.insertBefore(btn, userBtn);
            } else {
                legacyHeader.appendChild(btn);
            }
            console.debug('[SeerPlugin] Injected Seer button into Legacy Header');
        }

        // 3. Navigation Drawer Links
        injectDrawerLink();
    }

    function injectDrawerLink() {
        if (document.getElementById('drawerSeerLink')) {
            return;
        }

        // Modern Drawer List
        const modernList = document.querySelector('.MuiDrawer-root .MuiList-root') || document.querySelector('nav .MuiList-root');
        if (modernList) {
            const item = document.createElement('div');
            item.id = 'drawerSeerLink';
            item.className = 'MuiButtonBase-root MuiListItemButton-root MuiListItemButton-gutters';
            item.style.cursor = 'pointer';
            item.onclick = (e) => {
                e.preventDefault();
                window.location.hash = '/seer';
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
            link.id = 'drawerSeerLink';
            link.className = 'navMenuOption lnkMediaFolder';
            link.href = '#/seer';
            link.innerHTML = '<span class="material-icons navMenuOptionIcon travel_explore" aria-hidden="true">travel_explore</span><span class="navMenuOptionText">Requests & Discovery</span>';
            legacyDrawer.appendChild(link);
            console.debug('[SeerPlugin] Injected Seer link into Legacy Drawer');
        }
    }

    /**
     * Handles route transitions
     */
    function handleRoute() {
        const hash = window.location.hash || '';
        const isSeerRoute = hash.startsWith(SEER_ROUTE) || hash === '#/seer' || hash === '#seer';

        if (isSeerRoute) {
            mountSeer();
        } else {
            unmountSeer();
        }
    }

    function mountSeer() {
        if (!seerContainer) {
            seerContainer = document.createElement('div');
            seerContainer.id = 'seerPluginRoot';
            seerContainer.className = 'page type-interior seerPageRoot';
            seerContainer.style.minHeight = '100vh';
            seerContainer.style.position = 'relative';
            seerContainer.style.zIndex = '50';
            seerContainer.style.paddingTop = '1em';

            const appContainer = document.querySelector('.mainAnimatedPages') ||
                                 document.querySelector('.skinBody') ||
                                 document.querySelector('#reactRoot') ||
                                 document.body;
            appContainer.appendChild(seerContainer);
        }

        seerContainer.style.display = 'block';

        // Hide other main page views while Seer is active
        const otherPages = document.querySelectorAll('.page:not(#seerPluginRoot), .skinBody:not(:has(#seerPluginRoot))');
        otherPages.forEach((el) => {
            const htmlEl = el as HTMLElement;
            if (!htmlEl.closest('header') && !htmlEl.classList.contains('MuiAppBar-root')) {
                if (!htmlEl.hasAttribute('data-seer-prev-display')) {
                    htmlEl.setAttribute('data-seer-prev-display', htmlEl.style.display || '');
                }
                htmlEl.style.display = 'none';
            }
        });

        ReactDOM.render(React.createElement(SeerPage), seerContainer);
        console.debug('[SeerPlugin] SeerPage mounted successfully');
    }

    function unmountSeer() {
        if (seerContainer) {
            seerContainer.style.display = 'none';
            ReactDOM.unmountComponentAtNode(seerContainer);

            // Restore other page views
            const hiddenPages = document.querySelectorAll('[data-seer-prev-display]');
            hiddenPages.forEach((el) => {
                const htmlEl = el as HTMLElement;
                htmlEl.style.display = htmlEl.getAttribute('data-seer-prev-display') || '';
                htmlEl.removeAttribute('data-seer-prev-display');
            });
        }
    }

    // Initialize listeners
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectNavigation();
            handleRoute();
        });
    } else {
        injectNavigation();
        handleRoute();
    }

    // Repeated check to account for dynamic header redraws (React re-renders)
    setInterval(injectNavigation, 1000);
})();
