(function () {
    'use strict';

    var pluginId = 'b1b87a2a-4db3-4fc9-b59a-143c7b39922e';

    function loadConfiguration(view) {
        ApiClient.getPluginConfiguration(pluginId).then(function (config) {
            view.querySelector('#SeerServerUrl').value = config.SeerServerUrl || '';
            view.querySelector('#SeerAdminApiKey').value = config.SeerAdminApiKey || '';
            view.querySelector('#EnableProxy').checked = config.EnableProxy !== false;
            view.querySelector('#EnableUserDelegation').checked = config.EnableUserDelegation !== false;
            view.querySelector('#DefaultEnableBackdrops').checked = config.DefaultEnableBackdrops !== false;
            view.querySelector('#DefaultEnableGlassTheme').checked = config.DefaultEnableGlassTheme !== false;
        });
    }

    function saveConfiguration(view) {
        ApiClient.getPluginConfiguration(pluginId).then(function (config) {
            config.SeerServerUrl = view.querySelector('#SeerServerUrl').value.replace(/\/+$/, '');
            config.SeerAdminApiKey = view.querySelector('#SeerAdminApiKey').value;
            config.EnableProxy = view.querySelector('#EnableProxy').checked;
            config.EnableUserDelegation = view.querySelector('#EnableUserDelegation').checked;
            config.DefaultEnableBackdrops = view.querySelector('#DefaultEnableBackdrops').checked;
            config.DefaultEnableGlassTheme = view.querySelector('#DefaultEnableGlassTheme').checked;

            ApiClient.updatePluginConfiguration(pluginId, config).then(function (result) {
                Dashboard.processPluginConfigurationUpdateResult(result);
            });
        });
    }

    document.addEventListener('viewshow', function (e) {
        if (e.target.id === 'seerConfigurationPage') {
            var view = e.target;
            loadConfiguration(view);

            view.querySelector('#seerConfigForm').addEventListener('submit', function (event) {
                event.preventDefault();
                saveConfiguration(view);
                return false;
            });
        }
    });
})();
