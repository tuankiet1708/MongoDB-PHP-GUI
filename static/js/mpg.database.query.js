
/**
 * MongoDB PHP GUI namespace.
 * 
 * @type {object}
 */
var MPG = {};

/**
 * Instance of CodeMirror.
 * 
 * @type {?CodeMirror}
 */
MPG.codeMirror = null;

/**
 * Name of current database.
 * 
 * @type {string}
 */
MPG.databaseName = '';

/**
 * Name of current collection.
 * 
 * @type {string}
 */
MPG.collectionName = '';

/**
 * To do list sub-namespace.
 * 
 * @type {object}
 */
MPG.toDoList = {};

/**
 * Name of collection to reselect.
 * XXX Used for navigation.
 * 
 * @type {string}
 */
MPG.toDoList.reselectCollection = '';

/**
 * History of queries.
 * 
 * @type {Array}
 */
MPG.queryHistory = [];

/**
 * List of MongoDB and SQL keywords.
 * XXX Used for autocompletion.
 * 
 * @type {Array}
 */
MPG.mongoDBAndSQLKeywords = [

    '$eq', '$gt', '$gte', '$in', '$lt', '$lte', '$ne', '$nin',
    '$and', '$not', '$nor', '$or', '$exists', '$type',

    'SELECT', 'FROM', 'WHERE', 'IN', 'LIKE', 'AND', 'NOT', 'OR'

];

/**
 * Field names of current collection.
 * 
 * @type {Array}
 */
MPG.collectionFields = [];

/**
 * Document ID.
 * XXX Used by JsonView parser.
 * 
 * @type {string}
 */
MPG.documentId = '';

/**
 * Type of document ID.
 * XXX Used by JsonView parser.
 * 
 * @type {string}
 */
MPG.documentIdType = '';

/**
 * Cached output.
 * 
 * @type {string}
 */
MPG.cachedOutput = '';

/**
 * Initializes CodeMirror instance.
 * 
 * @returns {void}
 */
MPG.initializeCodeMirror = function() {

    MPG.codeMirror = CodeMirror.fromTextArea(
        document.querySelector('#mpg-filter-or-doc-textarea')
    );

    var historyPopButton = document.createElement('button');
    
    historyPopButton.className = 'mpg-history-pop-button';
    historyPopButton.innerHTML = '<i class="fa fa-history" aria-hidden="true"></i>';

    document.querySelector('.CodeMirror').appendChild(historyPopButton);

};

/**
 * Helpers sub-namespace.
 * 
 * @type {object}
 */
MPG.helpers = {};

/**
 * Indicates if device is extra small.
 * 
 * @returns {boolean}
 */
MPG.helpers.isXsDevice = function() {

    return window.matchMedia('(max-width: 576px)').matches;

};

/**
 * Does an ajax request.
 * 
 * @param {string} method 
 * @param {string} url 
 * @param {function} successCallback 
 * @param {?string} body
 * 
 * @returns {void}
 */
MPG.helpers.doAjaxRequest = function(method, url, successCallback, body) {

    var xhr = new XMLHttpRequest();

    xhr.addEventListener('readystatechange', function() {

        if ( this.readyState === 4 ) {
            if ( this.status === 200 ) {
                successCallback(this.responseText);
            } else {
                window.alert('Error: ' + JSON.parse(this.responseText).error.message);
            }
        }

    });

    xhr.open(method, url);
    xhr.send(body);

};

/**
 * Navigates on same page. Example: reselects database and collection after a refresh.
 * 
 * @returns {void}
 */
MPG.helpers.navigateOnSamePage = function() {

    var fragmentUrl = window.location.hash.split('#');
    var databaseAndCollectionName;
    var databaseSelector;

    if ( fragmentUrl.length === 2 && fragmentUrl[1] !== '' ) {

        databaseAndCollectionName = fragmentUrl[1].split('/');

        if ( databaseAndCollectionName.length === 1 ) {

            databaseSelector = '.mpg-database-link' + '[data-database-name="'
                + databaseAndCollectionName[0] + '"]';
            document.querySelector(databaseSelector).click();

        } else if ( databaseAndCollectionName.length === 2 ) {

            MPG.toDoList.reselectCollection = databaseAndCollectionName[1];

            databaseSelector = '.mpg-database-link' + '[data-database-name="'
                + databaseAndCollectionName[0] + '"]';
            document.querySelector(databaseSelector).click();

        }

    }

};

/**
 * Converts a SQL query to a MongoDB query.
 * 
 * @param {string} sql
 * @param {function} successCallback
 * 
 * @returns {void}
 */
MPG.helpers.convertSQLToMongoDBQuery = function(sql, successCallback) {

    if ( /GROUP BY/i.test(sql) ) {
        MPG.codeMirror.setValue(sql);
        return window.alert('SQL GROUP BY clause is not supported.');
    }

    if ( /ORDER BY/i.test(sql) ) {
        MPG.codeMirror.setValue(sql);
        return window.alert('SQL ORDER BY clause is not supported.');
    }

    if ( /LIMIT/i.test(sql) ) {
        MPG.codeMirror.setValue(sql);
        return window.alert('SQL LIMIT clause is not supported.');
    }

    MPG.helpers.doAjaxRequest(
        'POST',
        MPG_BASE_URL + '/ajaxSQLConvertToMongoDBQuery',
        successCallback,
        JSON.stringify({ "sql": sql })
    );

};

/**
 * Converts a string to any type.
 * 
 * @param {string} string 
 * @param {string} targetType
 * 
 * @returns {*}
 * 
 * @throws {Error}
 */
MPG.helpers.convertStringToAny = function(string, targetType) {

    var castedString = string;

    switch (targetType) {

        case 'number':
            castedString = ( string.indexOf('.') !== -1 ) ? parseFloat(string) : parseInt(string);
            if ( isNaN(castedString) ) {
                throw Error('[MongoDB PHP GUI] "' + string + '" is not a number');
            }
            break;

        case 'boolean':
            if ( string === 'true' ) {
                castedString = true;
            } else if ( string === 'false' ) {
                castedString = false;
            } else {
                throw Error('[MongoDB PHP GUI] "' + string + '" is not a boolean');
            }
            break;

        case 'object':
            castedString = ( string === 'null' ) ? null : JSON.parse(string);
            break;

    }

    return castedString;

};

/**
 * Converts any type to a string.
 * 
 * @param {*} any
 * 
 * @returns {*}
 */
MPG.helpers.convertAnyToString = function(any) {

    var string;

    switch (typeof any) {

        case 'object':
            string = ( any === null ) ? 'null' : JSON.stringify(any);
            break;

        case 'number':
        case 'boolean':
        default:
            string = any.toString();
            break;

    }

    return string;

};

/**
 * Downloads a file.
 * 
 * @see https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
 * 
 * @param {string} filename
 * @param {string} data
 * @param {string} type
 * 
 * @returns {void}
 */
MPG.helpers.downloadFile = function(filename, data, type) {

    var blob = new Blob([data], {type: type});

    if ( window.navigator.msSaveOrOpenBlob ) {

        window.navigator.msSaveBlob(blob, filename);

    } else {

        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);

    }

};

/**
 * Fixes responsive design.
 * 
 * @returns {void}
 */
MPG.fixResponsiveDesign = function() {

    if ( MPG.helpers.isXsDevice() ) {

        document.querySelector('#mpg-insert-one-button').innerHTML = 'Insert';
        document.querySelector('#mpg-delete-one-button').innerHTML = 'Delete';

    }

};

/**
 * Reloads collections of a specific database.
 * 
 * @param {string} databaseName
 * 
 * @returns {void}
 */
MPG.reloadCollections = function(databaseName) {

    var requestBody = { 'databaseName': databaseName };

    MPG.helpers.doAjaxRequest(
        'POST', MPG_BASE_URL + '/ajaxDatabaseListCollections', function(response) {

            var collectionsList = document.querySelector('#mpg-collections-list');

            collectionsList.innerHTML = '';
            MPG.collectionName = '';

            JSON.parse(response).forEach(function(collectionName) {

                collectionsList.innerHTML +=
                    '<li class="collection-name">'
                        + '<i class="fa fa-file-text" aria-hidden="true"></i> '
                        + '<a class="mpg-collection-link" '
                        + 'data-collection-name="' + collectionName
                        + '" href="#' + MPG.databaseName + '/' + collectionName + '">'
                        + collectionName
                        + '</a>'
                    + '</li>';
                
            });

            MPG.eventListeners.addCollections();

        },
        JSON.stringify(requestBody)
    );

};

/**
 * Event listeners sub-namespace.
 * 
 * @type {object}
 */
MPG.eventListeners = {};

/**
 * Adds an event listener on "Menu toggle" button.
 * 
 * @returns {void}
 */
MPG.eventListeners.addMenuToggle = function() {

    document.querySelector('#menu-toggle-button').addEventListener('click', function(_event) {
        document.querySelector('.navbar').classList.toggle('menu-expanded');
    });

};

/**
 * Adds an event listener on each database.
 * 
 * @returns {void}
 */
MPG.eventListeners.addDatabases = function() {

    document.querySelectorAll('.mpg-database-link').forEach(function(databaseLink) {

        databaseLink.addEventListener('click', function(_event) {

            MPG.databaseName = databaseLink.dataset.databaseName;

            document.querySelectorAll('.mpg-database-link').forEach(function(databaseLink) {
                databaseLink.classList.remove('font-weight-bold');
            });

            databaseLink.classList.add('font-weight-bold');

            MPG.reloadCollections(databaseLink.dataset.databaseName);

        });

    });

};

/**
 * Adds an event listener on each collection.
 * 
 * @returns {void}
 */
MPG.eventListeners.addCollections = function() {

    document.querySelectorAll('.mpg-collection-link').forEach(function(collectionLink) {

        collectionLink.addEventListener('click', function(_event) {
            
            MPG.collectionName = collectionLink.dataset.collectionName;
            
            document.querySelectorAll('.mpg-collection-link').forEach(function(collectionLink) {
                collectionLink.classList.remove('font-weight-bold');
            });

            collectionLink.classList.add('font-weight-bold');

            MPG.collectionFields = [];

            var requestBody = {
                'databaseName': MPG.databaseName,
                'collectionName': MPG.collectionName
            };

            MPG.helpers.doAjaxRequest(
                'POST',
                MPG_BASE_URL + '/ajaxCollectionEnumFields',
                function(response) {

                    JSON.parse(response).forEach(function(collectionField) {
                        if ( typeof collectionField === 'string' ) {
                            MPG.collectionFields.push(collectionField);
                        }
                    });

                    var sortSelect = document.querySelector('#mpg-sort-select');
                    sortSelect.innerHTML = '';

                    MPG.collectionFields.forEach(function(collectionField) {

                        sortSelect.innerHTML += '<option value="' + collectionField + '">'
                            + collectionField + '</option>';

                    });

                    document.querySelector('#mpg-output-code').innerHTML = '';

                    document.querySelector('#mpg-find-button').click();

                },
                JSON.stringify(requestBody)
            );

        });

    });

    if ( MPG.toDoList.reselectCollection !== '' ) {

        var collectionSelector = '.mpg-collection-link' + '[data-collection-name="'
            + MPG.toDoList.reselectCollection + '"]';
        document.querySelector(collectionSelector).click();

        MPG.toDoList.reselectCollection = '';

    }

};

/**
 * Adds an event listener on "Insert one" button.
 * 
 * @returns {void}
 */
MPG.eventListeners.addInsertOne = function() {

    document.querySelector('#mpg-insert-one-button').addEventListener('click', function(_event) {

        if ( MPG.databaseName === '' || MPG.collectionName === '' ) {
            return window.alert('Please select a database and a collection.');
        }

        // Synchronizes CodeMirror with Filter or Document text area.
        MPG.codeMirror.save();

        var requestBody = {
            'databaseName': MPG.databaseName,
            'collectionName': MPG.collectionName
        };
        
        var filterOrDocTextAreaValue = document.querySelector('#mpg-filter-or-doc-textarea').value;

        if ( filterOrDocTextAreaValue === '' ) {
            return window.alert('Please fill the document text area.');
        }
        
        requestBody.document = JSON.parse(filterOrDocTextAreaValue);
        
        MPG.helpers.doAjaxRequest(
            'POST',
            MPG_BASE_URL + '/ajaxCollectionInsertOne',
            function(response) {

                var outputCode = document.querySelector('#mpg-output-code');
                outputCode.innerHTML = 'Inserted: ' + JSON.parse(response);

            },
            JSON.stringify(requestBody)
        );

    });

};

/**
 * Adds an event listener on "Count" button.
 * 
 * @returns {void}
 */
MPG.eventListeners.addCount = function() {

    document.querySelector('#mpg-count-button').addEventListener('click', function(_event) {

        if ( MPG.databaseName === '' || MPG.collectionName === '' ) {
            return window.alert('Please select a database and a collection.');
        }

        // Synchronizes CodeMirror with Filter or Document text area.
        MPG.codeMirror.save();

        var requestBody = {
            'databaseName': MPG.databaseName,
            'collectionName': MPG.collectionName
        };

        var filterOrDocTextAreaValue = document.querySelector('#mpg-filter-or-doc-textarea').value;

        if ( filterOrDocTextAreaValue === '' ) {
            requestBody.filter = {};
        } else {
            requestBody.filter = JSON.parse(filterOrDocTextAreaValue);
        }

        MPG.helpers.doAjaxRequest(
            'POST',
            MPG_BASE_URL + '/ajaxCollectionCount',
            function(response) {

                var outputCode = document.querySelector('#mpg-output-code');
                outputCode.innerHTML = 'Count: ' + JSON.parse(response);

            },
            JSON.stringify(requestBody)
        );

    });

};

/**
 * Adds an event listener on "Delete one" button.
 * 
 * @returns {void}
 */
MPG.eventListeners.addDeleteOne = function() {

    document.querySelector('#mpg-delete-one-button').addEventListener('click', function(_event) {

        if ( MPG.databaseName === '' || MPG.collectionName === '' ) {
            return window.alert('Please select a database and a collection.');
        }

        // Synchronizes CodeMirror with Filter or Document text area.
        MPG.codeMirror.save();

        var requestBody = {
            'databaseName': MPG.databaseName,
            'collectionName': MPG.collectionName
        };

        var filterOrDocTextAreaValue = document.querySelector('#mpg-filter-or-doc-textarea').value;

        if ( filterOrDocTextAreaValue === '' ) {
            return window.alert('Please fill the filter text area.');
        }

        var deleteConfirmation = window.confirm(
            'Do you really want to delete document matching this criteria:\n' + filterOrDocTextAreaValue
        )

        if ( deleteConfirmation === false ) {
            return;
        }

        requestBody.filter = JSON.parse(filterOrDocTextAreaValue);
        
        MPG.helpers.doAjaxRequest(
            'POST',
            MPG_BASE_URL + '/ajaxCollectionDeleteOne',
            function(response) {

                var outputCode = document.querySelector('#mpg-output-code');
                outputCode.innerHTML = 'Deleted: ' + JSON.parse(response);

            },
            JSON.stringify(requestBody)
        );

    });

};

/**
 * Adds an event listener for updates.
 * 
 * @returns {void}
 */
MPG.eventListeners.addUpdate = function() {

    var updatableJsonValues = document.querySelectorAll(
        '.json-value[data-document-field-is-updatable="true"]'
    );

    updatableJsonValues.forEach(function(updatableJsonValue) {

        updatableJsonValue.addEventListener('click', function(event) {

            var documentField = event.currentTarget;

            var documentFieldNewValue = window.prompt('New value', documentField.innerHTML);

            if ( documentFieldNewValue === null ) {
                return;
            }

            documentFieldNewValue = MPG.helpers.convertStringToAny(
                documentFieldNewValue, documentField.dataset.documentFieldType
            );

            if ( MPG.documentIdType === 'number' ) {
                var documentId = parseInt(documentField.dataset.documentId);
            } else {
                var documentId = documentField.dataset.documentId;
            }

            var requestBody = {
                'databaseName': MPG.databaseName,
                'collectionName': MPG.collectionName,
                "filter": {
                    "_id": documentId
                },
                "update": {
                    "$set": {}
                }
            };

            requestBody.update.$set[documentField.dataset.documentFieldName] = documentFieldNewValue;

            MPG.helpers.doAjaxRequest(
                'POST',
                MPG_BASE_URL + '/ajaxCollectionUpdateOne',
                function(response) {

                    if ( JSON.parse(response) === 1 ) {
                        documentField.innerHTML = MPG.helpers.convertAnyToString(
                            documentFieldNewValue
                        );
                    }

                },
                JSON.stringify(requestBody)
            );

        });

    })

};

/**
 * Adds an event listener on "CodeMirror" change.
 * 
 * @returns {void}
 */
MPG.eventListeners.addCodeMirror = function() {

    MPG.codeMirror.on('change', function() {

        // If Filter or Document text area contains SQL:
        if ( /^SELECT/i.test(MPG.codeMirror.getValue()) ) {
            MPG.codeMirror.setOption('mode', 'sql');
        } else {
            MPG.codeMirror.setOption('mode', 'javascript');
        }

    });
    
};

/**
 * Adds an event listener on "History pop" button.
 * 
 * @returns {void}
 */
MPG.eventListeners.addHistoryPop = function() {

    document.querySelector('.CodeMirror .mpg-history-pop-button')
        .addEventListener('click', function(_event) {

        var lastQuery = MPG.queryHistory.pop();

        if ( lastQuery === MPG.codeMirror.getValue() ) {
            lastQuery = MPG.queryHistory.pop();
        }

        if ( typeof lastQuery === 'string' ) {
            MPG.codeMirror.setValue(lastQuery);
            MPG.codeMirror.save();
        } else {
            MPG.codeMirror.setValue('');
            MPG.codeMirror.save();
        }

    });

};

/**
 * Adds an event listener on "Find" button.
 * 
 * @returns {void}
 */
MPG.eventListeners.addFind = function() {

    document.querySelector('#mpg-find-button').addEventListener('click', function(_event) {

        if ( MPG.databaseName === '' || MPG.collectionName === '' ) {
            return window.alert('Please select a database and a collection.');
        }

        // Synchronizes CodeMirror with Filter or Document text area.
        MPG.codeMirror.save();

        var filterOrDocTextAreaValue = document.querySelector('#mpg-filter-or-doc-textarea').value;

        // If Filter or Document text area contains SQL:
        if ( /^SELECT/i.test(filterOrDocTextAreaValue) ) {

            MPG.codeMirror.setValue('');
            MPG.codeMirror.save();
            
            return MPG.helpers.convertSQLToMongoDBQuery(filterOrDocTextAreaValue,
                function(response) {

                    MPG.codeMirror.setValue(JSON.parse(response));
                    MPG.codeMirror.save();

                    document.querySelector('#mpg-find-button').click();

                }
            );

        }

        var requestBody = {
            'databaseName': MPG.databaseName,
            'collectionName': MPG.collectionName
        };

        if ( filterOrDocTextAreaValue === '' ) {
            requestBody.filter = {};
        } else {
            MPG.queryHistory.push(filterOrDocTextAreaValue);
            requestBody.filter = JSON.parse(filterOrDocTextAreaValue);
        }

        requestBody.options = {};
        requestBody.options.limit = parseInt(document.querySelector('#mpg-limit-input').value);

        var sortSelect = document.querySelector('#mpg-sort-select');

        if ( sortSelect.value !== '' ) {

            var order = parseInt(document.querySelector('#mpg-order-select').value);

            requestBody.options.sort = {};
            requestBody.options.sort[sortSelect.value] = order;

        }

        MPG.helpers.doAjaxRequest(
            'POST',
            MPG_BASE_URL + '/ajaxCollectionFind',
            function(response) {

                MPG.cachedOutput = response;

                var outputCode = document.querySelector('#mpg-output-code');
                outputCode.innerHTML = '';

                var jsonViewTree = JsonView.createTree(response);
                JsonView.render(jsonViewTree, outputCode);
                JsonView.expandChildren(jsonViewTree);
                MPG.documentId = '';

                MPG.eventListeners.addUpdate();

            },
            JSON.stringify(requestBody)
        );

    });

};

/**
 * Adds an event listener for autocompletion.
 * 
 * @returns {void}
 */
MPG.eventListeners.addCtrlSpace = function() {

    document.addEventListener('keydown', function(event) {
        if ( event.ctrlKey && event.code == 'Space' ) {
            MPG.codeMirror.showHint();
        }
    });

};

/**
 * Adds an event listener on "Export" button.
 * 
 * @returns {void}
 */
MPG.eventListeners.addExport = function() {

    document.querySelector('#mpg-export-button').addEventListener('click', function(_event) {

        if ( MPG.cachedOutput === '' ) {
            return window.alert('There is nothing to export for now...');
        }

        MPG.helpers.downloadFile(
            'mongodb-php-gui-export-' + (new Date()).getTime() + '.json',
            JSON.stringify(JSON.parse(MPG.cachedOutput), null, 4),
            'application/json'
        );

    });

};

// When document is ready:
window.addEventListener('DOMContentLoaded', function(_event) {

    MPG.initializeCodeMirror();
    MPG.fixResponsiveDesign();

    MPG.eventListeners.addMenuToggle();
    MPG.eventListeners.addDatabases();
    MPG.eventListeners.addInsertOne();
    MPG.eventListeners.addCount();
    MPG.eventListeners.addDeleteOne();
    MPG.eventListeners.addCodeMirror();
    MPG.eventListeners.addHistoryPop();
    MPG.eventListeners.addFind();
    MPG.eventListeners.addCtrlSpace();
    MPG.eventListeners.addExport();

    MPG.helpers.navigateOnSamePage();

});
