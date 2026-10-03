import React from 'react';
import ReactDOM from 'react-dom';
import { SeerPage } from './SeerPage';
import './styles/seer.scss';

(function initJellyfinSeerPlugin() {
    'use strict';

    const SEER_ROUTE = '#/seer';
    let seerContainer: HTMLElement | null = null;

    /**
     * Injects the Seer navigation icon into the Jellyfin header and drawer menu
     */
    function injectNavigation() {
        // 1. Top bar button
        const headerRight = document.querySelector('.skinHeader .headerRight');
        if (headerRight && !document.getElementById('headerSeerBtn')) {
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

            const userBtn = headerRight.querySelector('.headerUserButton');
            if (userBtn) {
                headerRight.insertBefore(btn, userBtn);
            } else {
                headerRight.appendChild(btn);
            }
        }

        // 2. Navigation Drawer Link
        const drawerOptions = document.querySelector('.mainDrawer .navMenuOptionContainer') || document.querySelector('.navMenuOptionContainer');
        if (drawerOptions && !document.getElementById('drawerSeerLink')) {
            const link = document.createElement('a');
            link.id = 'drawerSeerLink';
            link.className = 'navMenuOption lnkMediaFolder';
            link.href = '#/seer';
            link.innerHTML = '<span class="material-icons navMenuOptionIcon travel_explore" aria-hidden="true">travel_explore</span><span class="navMenuOptionText">Requests & Discovery</span>';
            drawerOptions.appendChild(link);
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
            seerContainer.style.zIndex = '1';

            const appContainer = document.querySelector('.mainAnimatedPages') || document.body;
            appContainer.appendChild(seerContainer);
        }

        seerContainer.style.display = 'block';

        // Hide sibling views while Seer is active
        const siblings = seerContainer.parentElement?.children;
        if (siblings) {
            for (let i = 0; i < siblings.length; i++) {
                const child = siblings[i] as HTMLElement;
                if (child !== seerContainer && child.classList.contains('page')) {
                    child.setAttribute('data-seer-prev-display', child.style.display || '');
                    child.style.display = 'none';
                }
            }
        }

        ReactDOM.render(React.createElement(SeerPage), seerContainer);
    }

    function unmountSeer() {
        if (seerContainer) {
            seerContainer.style.display = 'none';
            ReactDOM.unmountComponentAtNode(seerContainer);

            // Restore sibling views
            const siblings = seerContainer.parentElement?.children;
            if (siblings) {
                for (let i = 0; i < siblings.length; i++) {
                    const child = siblings[i] as HTMLElement;
                    if (child !== seerContainer && child.hasAttribute('data-seer-prev-display')) {
                        child.style.display = child.getAttribute('data-seer-prev-display') || '';
                        child.removeAttribute('data-seer-prev-display');
                    }
                }
            }
        }
    }

    // Initialize listeners
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);

    // Initial check and periodic navigation reinjection
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectNavigation();
            handleRoute();
        });
    } else {
        injectNavigation();
        handleRoute();
    }

    setInterval(injectNavigation, 2500);
})();
