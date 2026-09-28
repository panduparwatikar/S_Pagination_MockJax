/**
 * @license
 * Copyright (c) 2014, 2026, Oracle and/or its affiliates.
 * Licensed under The Universal Permissive License (UPL), Version 1.0
 * as shown at https://oss.oracle.com/licenses/upl/
 * @ignore
 */
/**
 * A top-level require call executed by the Application.
 * Although 'knockout' would be loaded in any case (it is specified as a  dependency
 * by some modules), we are listing it explicitly to get the reference to the 'ko'
 * object in the callback
 */
require(['ojs/ojbootstrap', 'ojs/ojcontext', 'knockout', 'ojs/ojmodel', 'ojs/ojpagingdataproviderview', 'ojs/ojcollectiondataprovider',
  './jquery.mockjax.min', 'ojs/ojknockout', 'ojs/ojtable', 'ojs/ojpagingcontrol',
  'ojs/ojbutton', 'ojs/ojtoolbar'],
  function (Bootstrap, Context, ko, ModelClass, PagingDataProviderView, CollectionDataProvider) {
    Bootstrap.whenDocumentReady().then(
      function () {
        var self;

        function init() {
          class ViewModel {
            constructor() {
              self = this;

              $.mockjax({
                url: '/api/data/photos',
                type: 'GET',
                response: function (settings, done) {
                  var mockSelf = this;

                  return (async function () {
                    let response = await fetch('https://jsonplaceholder.typicode.com/photos?_start=0&_limit=100');
                    let json = await response.json();
                    mockSelf.responseText = json;
                    done();
                  })()
                }
              });

              self.parsePhoto = (response) => {
                return { ...response,"color":response.thumbnailUrl.substring(response.thumbnailUrl.lastIndexOf("/")+1) };
              };

              self.serviceURL = '/api/data/photos';

              self.photoModel = ModelClass.Model.extend({
                urlRoot: self.serviceURL,
                parse: self.parsePhoto,
                idAttribute: 'id'
              });

              self.myPhoto = new self.photoModel();
              self.photoCollection = ModelClass.Collection.extend({
                url: self.serviceURL,
                model: self.myPhoto
              });

              self.collection = new self.photoCollection();

              self.pdp = new PagingDataProviderView(new CollectionDataProvider(self.collection));

              self.columns = [{ "field": "title", "headerText": "Title", "sortable": "disabled" },
              {"field":"color","template":"photoImg", "headerText": "Image", "sortable": "disabled"},
              { "template": "deleteRow", "headerText": "Delete", "sortable": "disabled" }];
            }
          }

          ViewModel.prototype.getData = (event) => {
            $.ajax({
              url: '/api/data/photos',
              type: 'GET',
              success: (response) => {
                console.log("RESPONSE");
                console.log(response);
              }
            });
          }

          ViewModel.prototype.deleteRow = (row) => {
            let model = $(".oj-table")[0].data.dataProvider.collection.get(row.key);
            $(".oj-table")[0].data.dataProvider.collection.remove(model);
          }

          ViewModel.prototype.addRow = () => {
            let modelLength = $(".oj-table")[0].data.dataProvider.collection.models.length;
            let newModel = new ModelClass.Model({
              "almbumId": 1,
              "id": new Date().getTime(),
              "title": "New Photo",
              "thumbnailUrl":"https://via.placeholder.com/150/92c952",
              "color":"92c952"
            });

            let startItemIndex = $(".oj-table")[0].data.getStartItemIndex();
            $(".oj-table")[0].data.dataProvider.collection.add(newModel, { at: startItemIndex });
          }

          ko.applyBindings(new ViewModel());
        }
        // If running in a hybrid (e.g. Cordova) environment, we need to wait for the deviceready
        // event before executing any code that might interact with Cordova APIs or plugins.
        if (document.body.classList.contains('oj-hybrid')) {
          document.addEventListener('deviceready', init);
        } else {
          init();
        }
        // release the application bootstrap busy state
        Context.getPageContext().getBusyContext().applicationBootstrapComplete();

      });
  }
);
