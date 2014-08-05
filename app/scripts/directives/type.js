'use strict';

angular.module('lelylan.directives.type.directive', [])

angular.module('lelylan.directives.type.directive').directive('type', [
  '$rootScope',
  '$timeout',
  '$compile',
  '$templateCache',
  '$http',
  'Profile',
  'Type',
  'Property',
  'Function',
  'Status',

  function(
    $rootScope,
    $timeout,
    $compile,
    $templateCache,
    $http,
    Profile,
    Type,
    Property,
    Function,
    Status
  ) {

  var definition = {
    restrict: 'EA',
    replace: true,
    scope: {
      typeId: '@',
      typeTemplate: '@'
    }
  };

  definition.link = function(scope, element, attrs) {


    /*
     * CONFIGURATIONS
     */

    // active view
    scope.view = { path: '/loading' }

    // active connection
    scope.connection = 'properties';

    // template
    scope.template = attrs.deviceTemplate || 'views/templates/default.html';

    // property types
    scope.config = {
      property: {
        types: {
          'text': 'text',
          'number': 'number',
          'range': 'range',
          'color': 'color',
          'password': 'password',
          'date': 'date',
          'time': 'time',
          'datetime': 'datetime',
          'url': 'url'
        }
      }
    };


    /*
     * DYNAMIC LAYOUT
     */

    var compile = function() {
      $http.get(scope.template, { cache: $templateCache }).success(function(html) {
        element.html(html);
        $compile(element.contents())(scope);
      });
    }

    compile();


    /*
     * API REQUESTS
     */

    /* watches the device ID and gets the device representation and calls the type API */
    scope.$watch('typeId', function(value) {
      if (value) {
        Type.find(value).
          success(function(response) {
            scope.view.path = '/default';
            scope.type = response;
          }).
          error(function(data, status) {
            scope.view.path = '/message';
            scope.message   = { title: 'Something went wrong', description: 'Most probably the type you are trying to load does not exist' }
          });
      }
    });


    /*
     * GENERIC BEHAVIOUR
     */

    /* open and close one connection */
    scope.toggle = function(connection) {
      connection.open = !connection.open;
    }

    /* check if the owner is logged in */
    scope.isOwner = function() {
      return (Profile.get() && Profile.get().id == scope.type.owner.id);
    }

    /* default visualization */
    scope.showDefault = function() {
      scope.view.path = '/default';
    }

    /* set the visible connection (properties, functions, status or category) */
    scope.setConnection = function(connection) {
      scope.connection = connection;
      scope.showDefault();
    }


    /*
     * PROPERTY BEHAVIOUR
     */

    scope.addProperty = function() {
      Property.create({name: 'New', type: 'text'}).
        success(function(response) {
          response.open = true;
          scope.type.properties.unshift(response);
          var properties = _.pluck(scope.type.properties, 'id')
          Type.update(scope.type.id, { properties: properties });
        });
    }

    scope.updateProperty = function(property, form) {
      property.status = 'Saving';
      Property.update(property.id, property).
        success(function(response) {
          $timeout(function() {
            property.status = null;
            form.$setPristine()
          }, 500);
        }).
        error(function(data, status) {
          scope.view.path = '/message';
          scope.message = { title: 'Something went wrong', description: 'There was a problem while saving the resource.' }
        });
    }

    /* remove one element to the list of the accepted elements */
    scope.removeAccepted = function(property, index, form) {
      delete property.accepted.splice(index, 1);
      form.$setDirty(); // bug (the dirty is not activated otherwise)
    }

    /* add one element to the list of the accepted elements */
    scope.addAccepted = function(property) {
      property.accepted.push({key: '', value: ''});
    }


    /*
     * FUNCTION BEHAVIOUR
     */

    scope.addFunction = function() {
      Function.create({name: 'New'}).
        success(function(response) {
          response.open = true;
          scope.type.functions.unshift(response);
          var functions = _.pluck(scope.type.functions, 'id')
          Type.update(scope.type.id, { functions: functions });
        });
    }

    scope.updateFunction = function(_function, form) {
      _function.status = 'Saving';
      Function.update(_function.id, _function).
        success(function(response) {
          $timeout(function() {
            _function.status = null;
            form.$setPristine()
          }, 500);
        }).
        error(function(data, status) {
          scope.view.path = '/message';
          scope.message = { title: 'Something went wrong', description: 'There was a problem while saving the resource.' }
        });
    }

    /* remove one element to the list of the effected properties */
    scope.removeFunctionProperty = function(_function, index, form) {
      delete _function.properties.splice(index, 1);
      form.$setDirty(); // bug (the dirty is not activated otherwise)
    }

    /* add one element to the list of the effected properties */
    scope.addFunctionProperty = function(_function) {
      _function.properties.push({ id: '', value: ''});
    }


    /*
     * STATUSES BEHAVIOUR
     */

    scope.addStatus = function() {
      Status.create({ name: 'New'}).
        success(function(response) {
          response.open = true;
          scope.type.statuses.unshift(response);
          var statuses = _.pluck(scope.type.statuses, 'id')
          Type.update(scope.type.id, { statuses: statuses });
        });
    }

    scope.updateStatus = function(status, form) {
      status.status = 'Saving';

      // normalize status property values to be array
      _.each(status.properties, function(property) {
        if ((typeof property.values) == 'string') {
          property.values = property.values.replace(/ /g,'');
          property.values = property.values.split(',')
        }
      });

      Status.update(status.id, status).
        success(function(response) {
          $timeout(function() {
            status.status = null;
            form.$setPristine()
          }, 500);
        }).
        error(function(data, status) {
          scope.view.path = '/message';
          scope.message = { title: 'Something went wrong', description: 'There was a problem while saving the resource.' }
        });
    }

    /* remove one element to the list of the accepted elements */
    scope.removeStatusProperty = function(status, index, form) {
      delete status.properties.splice(index, 1);
      form.$setDirty(); // bug (the dirty is not activated otherwise)
    }

    /* add one element to the list of the accepted elements */
    scope.addStatusProperty = function(status) {
      status.properties.push({ id: '', values: []});
    }



    /*
     * CONNECTION DELETION BEHAVIOUR
     */

    scope.confirmDeleteConnection = function(connection, index, name) {
      scope.deleting = { connection: connection, index: index, name: name };
      if (scope.deleting.name == 'properties') { scope.deleting.klass = Property }
      if (scope.deleting.name == 'functions')  { scope.deleting.klass = Function }
      if (scope.deleting.name == 'statuses')   { scope.deleting.klass = Status }
      scope.view.path = '/delete' ;
    }

    scope.deleteConnection = function(confirm) {
      if (scope.deleting.connection.name == confirm) {

        var klass      = scope.deleting.klass;
        var connection = scope.deleting.connection;
        var index      = scope.deleting.index;
        var name       = scope.deleting.name;

        scope.deleting.klass.delete(connection.id).
          success(function(response) {
            scope.type[name].splice(index, 1);
            var connections = _.pluck(scope.type[name], 'id');
            var params = {};
            params[name] = _.pluck(scope.type.properties, 'id');
            Type.update(scope.type.id, { properties: connections });
            scope.showDefault();
          });
      }
    }


  }

  return definition
}]);
