'use strict';

/**
 * @ngdoc overview
 * @name lsAngularApp
 * @description
 * # lsAngularApp
 *
 * Main module of the application.
 */
angular
  .module('lsAngularApp', [
    'ngAnimate',
    'ngAria',
    'ngMessages',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngMaterial'
  ])
  .config(function($interpolateProvider,$mdThemingProvider) {

    // to avoid conflicts with Twig's templates, use a different type of binding
    $interpolateProvider.startSymbol('[[');
    $interpolateProvider.endSymbol(']]');

    // pass the theme colours from main.htm to Angular's theming provider
    var lemonstandPrimary = $mdThemingProvider.extendPalette('cyan', {
      '500': themePrimaryColor,
      'contrastDefaultColor': 'light'
    });
    var lemonstandSecondary = $mdThemingProvider.extendPalette('amber', {
      '500': themeSecondaryColor,
      'contrastDefaultColor': 'light'
    });

    var lemonstandAccent = $mdThemingProvider.extendPalette('pink', {
      '500': themeAccentColor,
      'contrastDefaultColor': 'light'
    });

    // Register the new color palette map with the name <code>neonRed</code>
    $mdThemingProvider.definePalette('lsPrimary', lemonstandPrimary);
    $mdThemingProvider.definePalette('lsSecondary', lemonstandSecondary);
    $mdThemingProvider.definePalette('lsAccent', lemonstandAccent);

    // Use that theme for the primary intentions
    $mdThemingProvider.theme('default')
      .primaryPalette('lsPrimary')
      .accentPalette('lsSecondary')
      .warnPalette('lsAccent');

  })
  .run(function(ThemeService,$rootScope,$window,$timeout){
    $rootScope.$ls = $window.localStorage;

    //load the LS theme from the "theme service"
    //** to be removed, use Twig for all theming
    ThemeService.get().then(function(results){
      $rootScope.$theme = results.data;
      $rootScope.$emit('themeLoaded');
    });

    $rootScope.date = new Date();     //generic date for the footer
    $rootScope.compiled = [];         //keep a record of what templates have been recompiled since load
    $rootScope.loadingScreen = false; //show the spinner
    $rootScope.showLoadingScreen = function(){ $rootScope.loadingScreen = true; };
    $rootScope.hideLoadingScreen = function(){ $rootScope.loadingScreen = false; $rootScope.$apply(); };
    $(window).on('onAfterAjaxUpdate onAjaxSuccess onAjaxFailure', function(e){
      // hide the spinner after hearing back from LS
      $rootScope.hideLoadingScreen();
    });

    //show 'flash' messages, if they exist (check out main.htm)
    var flashDelay;
    $rootScope.hideFlash = function(delay){
      $timeout.cancel(flashDelay);
      flashDelay = $timeout(function(){
        $rootScope.showFlash = false;
        $timeout(function(){
          $rootScope.flashMessage = null;
        },800);
      },delay);
    };

    $window.flash = function(message,delay){
      if (message.length){
        delay = typeof delay !== 'undefined' ? delay : 10000;
        $rootScope.showFlash = true;
        $rootScope.flashMessage = message;
        $rootScope.$apply();
        $rootScope.hideFlash(delay);
      }
    };
  });



/**
 * @ngdoc function
 * @name lsAngularApp.controller:HomeCtrl
 * @description
 * # HomeCtrl
 * Controller of the lsAngularApp
 */
angular.module('lsAngularApp')
  .controller('HomeCtrl', function ($scope,ThemeService, CategoryService, ProductService,$timeout) {

    //variables
    $scope.productListLimit = 5;
    $scope.blogPostLimit = 4;
    $scope.categories = [];
    $scope.productList = [];

    //services
    ThemeService.get().then(function(results){
      $scope.banner = results.data.banner;
      $scope.banner.button.text = 'Learn more';
    });

    CategoryService.all().then(function(results){
      angular.forEach(results.data.categories, function(category){
        $scope.categories.push(category);
      });
    });

    ProductService.featured().then(function(results){
      angular.forEach(results.data.products, function(product){
        $scope.productList.push(product);
      });
    });
  });


 /**
  * @ngdoc function
  * @name lsAngularApp.controller:NavCtrl
  * @description
  * # NavCtrl
  * Controller of the lsAngularApp
  */

angular.module('lsAngularApp')
  .controller('NavCtrl', function ($rootScope,$scope,$filter,CartService,CategoryService,$q,$timeout,$mdSidenav, $http, LEMONSTAND) {

      //display the current nav item as 'active'
      var getCurrentNavItem = function(){
        var path = window.location.pathname.slice(1).split('/')[0];
        if (path === 'categories' ||  path === 'product' || path === 'products'){
          $scope.currentNavItem = 'products';
        }
        else if ( !path ) {
          $scope.currentNavItem = 'home';
        }
        else {
          $scope.currentNavItem = path;
        }
      };
      getCurrentNavItem();

      $scope.cmsNav = angular.element('#cms-menu').find('a').map(function(idx, el ){
          return {text : el.text, href : el.href};
      });

      // call Angular Material's $mdSidenav service
      $scope.openSideNav =  function(navID){ $mdSidenav(navID).open();  };
      $scope.closeSidenav = function(navID){ $mdSidenav(navID).close(); };

      // controller for dropdown menus in the navbar
      var originatorEv;
      $scope.openMenu = function($mdOpenMenu, $event) {
        originatorEv = $event;
        $mdOpenMenu($event);
      };

      CategoryService.all().then(function(results){
        $scope.categories = $filter('arrayColumns')( results.data.categories, 4 );
      });

      $rootScope.categoryViewActive = false;

      $rootScope.toggleCategoryView = function(){
        $rootScope.categoryViewActive = !$rootScope.categoryViewActive;
      };

      $rootScope.$on('$routeChangeStart', function(){
        $rootScope.categoryViewActive = false;
      });

      // to be removed, use LS's AJAX functions for this
      $rootScope.$on('cartUpdated', function(event,cart){
        $scope.cart = cart;
      });

      $scope.favourites = CartService.favourites();
      $scope.cart = CartService.cart();

      $rootScope.addFavourite = function(product){
        CartService.addFavourite(product).then(function(favs){
          $scope.favourites = favs;
        });
      };

      $rootScope.removeFavourite = function(product){
        CartService.removeFavourite(product).then(function(favs){
          $scope.favourites = favs;
        });
      };

      $rootScope.isFavourite = function(product){
        var favs = CartService.favourites();
        var isFav = $filter('filter')( favs, {'id': product.id}, true).length >= 1 ? true : false;
        return isFav;
      };

      // to be removed, use LS's AJAX functions for this
      $rootScope.removeFromCart = function(product){
        CartService.removeFromCart(product).then(function(){
          product.in_cart = false;
        });
      };

      // to be removed, use LS's AJAX functions for this
      $rootScope.addToCart = function(product){
        CartService.addToCart(product).then(function(){
          product.in_cart = true;
        });
      };

      $scope.searchText = '';

      $scope.querySearch = function(query) {
        return $http.get(
	  LEMONSTAND.SEARCH,
	  {cache: true, params: {query: query}}).then(
	  function(result) { return result.data.products; });
      };

      $scope.removeCartItem = function(e) {

        $.ajax({
            data : { delete_item: e.currentTarget.getAttribute('delete-item') },
            type: 'post',
            url: '/',
            headers: {
              'X-Event-Handler': 'shop:cart'
            },
            success: function(data) {
              location.reload();
            }
        });
      };

    });
    
    
angular.module('lsAngularApp')
  .controller('footerNavCtrl', function ($scope) {
      $scope.footerCmsNav = angular.element('#cms-footer').find('a').map(function(idx, el ){
          return {text : el.text, href : el.href};
      });

 });
/**
 * @ngdoc service
 * @name lsAngularApp.global
 * @description
 * # global
 * Constants in the lsAngularApp.
 */
angular.module('lsAngularApp')
  .constant('LEMONSTAND', (function(){
    var resource = 'https://'+ window.location.hostname +'/api';
    return {
      RESOURCE: resource,
      PRODUCTS: resource + '/products/',
      FEATURED: resource + '/products/featured/',
      CATEGORIES: resource + '/categories/',
      THEME: resource + '/theme/',
      BLOG: resource + '/blog/',
      SEARCH: resource + '/search'
    };
  })());

  window.indexOfObject = function(arr, obj){
    for(var i = 0; i < arr.length; i++){
        if(angular.equals(arr[i], obj)){
            return i;
        }
    }
    return -1;
  };



/**
 * @ngdoc service
 * @name lsAngularApp.ThemeService
 * @description
 * # ThemeService
 * Service in the lsAngularApp.
 ********** TO BE REMOVED, USE TWIG FOR THEMING **********
 */
angular.module('lsAngularApp')
  .service('ThemeService', function ($http, $q, LEMONSTAND) {
    this.get = function(){
      return $http.get(LEMONSTAND.THEME);
    };
  });



/**
 * @ngdoc service
 * @name lsAngularApp.CategoryService
 * @description
 * # CategoryService
 * Service in the lsAngularApp.
 */
angular.module('lsAngularApp')
  .service('CategoryService', function ($http, $q, LEMONSTAND,$filter) {

    //get all product categories if they exist/are defined in main.htm
    this.all = function(){
      if ( typeof categories !== 'undefined' ){
        var deferred = $q.defer();
        var results = { data: categories };
        deferred.resolve(results);
        return deferred.promise;
      }
      else {
        //if not defined, call the categories service
        return $http.get(LEMONSTAND.CATEGORIES);
      }
    };

    this.get = function(slug,forceAjax){
      if ( typeof categories !== 'undefined' && !forceAjax ){
        var deferred = $q.defer();
        var category = $filter('filter')( categories.categories, { 'url_name': slug }, true )[0];
        var results = { data: category };
        deferred.resolve(results);
        return deferred.promise;
      }
      else {
        return $http.get(LEMONSTAND.CATEGORIES + slug);
      }
    };

  });



/**
 * @ngdoc service
 * @name lsAngularApp.ProductService
 * @description
 * # ProductService
 * Service in the lsAngularApp.
 */
angular.module('lsAngularApp')
  .service('ProductService', function ($http, $q, LEMONSTAND) {

    this.all = function(){
      if ( typeof products !== 'undefined' ){
        var deferred = $q.defer();
        var results = { data: products };
        deferred.resolve(results);
        return deferred.promise;
      }
      else {
        return $http.get(LEMONSTAND.PRODUCTS, {cache: true});
      }
    };

    this.category = function(category, start, length){
      if(category) {
        return $http.get(LEMONSTAND.CATEGORIES + category,
          {cache: true,
          params: {start: start, length: length}});
      } else {
        return $http.get(LEMONSTAND.PRODUCTS, {cache: true});
      }
    };

    this.get = function(slug){
      return $http.get(LEMONSTAND.PRODUCTS + slug);
    };

    this.featured = function(page){
      if( typeof featuredProducts !== 'undefined' ){
        var deferred = $q.defer();
        var results = { data: featuredProducts };
        deferred.resolve(results);
        return deferred.promise;
      }
      else {
        page = angular.isUndefined(page) ? 1 : page;
        return $http.get(LEMONSTAND.FEATURED + page, {cache: true});
      }
    };

  });



  /**
   * @ngdoc service
   * @name lsAngularApp.BlogService
   * @description
   * # BlogService
   * Service in the lsAngularApp.
   */
  angular.module('lsAngularApp')
    .service('BlogService', function ($http, $q, LEMONSTAND) {

      // get all blog posts so we can pass it to the view
      this.all = function(){
        if ( typeof blogPosts !== 'undefined' ){
          var deferred = $q.defer();
          var results = { data: blogPosts };
          deferred.resolve(results);
          return deferred.promise;
        }
        else {
          return $http.get(LEMONSTAND.BLOG);
        }
      };
    });




/**
 * @ngdoc filter
 * @name lsAngularApp.filter:moment
 * @function
 * @description
 * # moment
 * Filter in the lsAngularApp.
 */
angular.module('lsAngularApp')
  .filter('moment', function () {
    return function (date) {
      // use moment.js for 'fuzzy times'
      var moment = window.moment;
      date = new Date(date);
      moment.updateLocale('en', {
          relativeTime : {
            d : 'yesterday'
          }
      });
      var ago = moment(date).fromNow(true);
      ago += ago.indexOf('yesterday') !== -1 ? ' at '+moment(date).format('hh:mm') : ' ago';
      return ago;
    };
  });



/**
 * @ngdoc filter
 * @name lsAngularApp.filter:capitalize
 * @function
 * @description
 * # capitalize
 * Filter in the lsAngularApp.
 */
angular.module('lsAngularApp')
  .filter('capitalize', function () {
    return function (input) {
      //capitalize a string
      return input.charAt(0).toUpperCase() + input.slice(1);
    };
  });



/**
 * @ngdoc service
 * @name lsAngularApp.MailChimpService
 * @description
 * # MailChimpService
 * Service in the lsAngularApp.
 */
angular.module('lsAngularApp')
  .service('MailChimpService', function ($http,$rootScope) {

    // get the MailChimp credentials from the LS theme API
    this.add = function(email){
      var MailChimp = {
        dc: $rootScope.$theme.mailchimp.api_key.split('-')[1],
        uri: '.api.mailchimp.com/2.0',
        api_key: $rootScope.$theme.mailchimp.api_key,
        list_id: $rootScope.$theme.mailchimp.list_id
      };
      return $http.post('https://' + MailChimp.dc + MailChimp.uri  +'/lists/subscribe?apikey='+ MailChimp.api_key + '&id='+ MailChimp.list_id +'&email[email]='+email);
    };
  });



/**
 * @ngdoc directive
 * @name lsAngularApp.directive:mailchimp
 * @description
 * # mailchimp
 */
angular.module('lsAngularApp')
  .controller('MailChimpCtrl', function (MailChimpService,$timeout,$scope) {

      $scope.resetForm = function(form){
        form.$setPristine();
        form.$setUntouched();
      };

      $scope.mailchimpAdd = function(form){
        if (form.honey.$touched){
          //make sure bots don't get through
          form.email_address.$error.unknown = true;
        }
        else if (form.$valid){
          // if the form is valid, submit it to mailchimp
          MailChimpService.add($scope.mailchimp_email).then(function(result){
            if (result.status === 200){
              form.email_address.$error.success = true;
              // reset the form after 10 seconds
              $timeout(function(){ $scope.resetForm(form); $scope.mailchimp_email = ''; },10000);
            }
            else { form.email_address.$error.unknown = true; }
          }, function(err){
            //if the email has already been added, tell the user
            if (err.data.code === 214){ form.email_address.$error.exists = true; }
            else { form.email_address.$error.unknown = true; }
          });
        }
      };
  });


/**
 * @ngdoc filter
 * @name lsAngularApp.filter:arrayColumns
 * @function
 * @description
 * # arrayColumns
 * Filter in the lsAngularApp.
 */
angular.module('lsAngularApp')
  .filter('arrayColumns', function () {
    return function (input,cols) {
      // split an array into columns (eg. product categories mega menu dropdown)
      var arr = [];
      for(var i = 0; i < input.length; i++) {
        var colIdx = i % cols;
        arr[colIdx] = arr[colIdx] || [];
        arr[colIdx].push(input[i]);
      }
      return arr;
    };
  });



/**
 * @ngdoc function
 * @name lsAngularApp.controller:CategoriesCtrl
 * @description
 * # CategoriesCtrl
 * Controller of the lsAngularApp
 */
angular.module('lsAngularApp')
  .controller('CategoriesCtrl', function ($scope,CategoryService,$filter,$timeout,ProductService,$location) {

    $scope.productsLoading = true;
    /**
      Set the product list limit on load
      # Get from localstorage if it exists; if not, default is 5
      # On load, paginate all of that category's items
     */
    $scope.productListLimit = Number($scope.$ls.productPageListLimit ? $scope.$ls.productPageListLimit : 5);
    $scope.setProductLimit = function(int){
      $scope.productListLimit = int;
      $scope.$ls.productPageListLimit = int;
    };

    $scope.filters = {
      category: $location.path().split('/').slice(1),
      price: null,
      brand: null,
      search: null,
      sale: false,
      limit: $scope.productListLimit
    };

   $scope.resetFilters = function(){
      $scope.filters.category = [],
      $scope.filters.price = null;
      $scope.filters.brand = null;
      $scope.displayBrand = null;
      $scope.filters.search = null;
      $scope.filters.sale = false;
    }
    
    $scope.showSaleItems = false;
    
    $scope.toggleSaleItems = function() {
      $scope.filters.price = null;
      $scope.filters.brand = null;
      $scope.filters.search = null;
      $scope.filters.sale = $scope.showSaleItems ? true : false;
    }

    var setProducts = function(results){
      if (results.data.products.length){
        var maxPrice = Math.ceil($filter('orderBy')( results.data.products, 'price', true )[0].price /100)*100;
        $scope.priceFilter = {
          max: maxPrice,
          min: 0
        };
        $scope.filters.price = maxPrice;
        //add to the `brands` array using the indexOfObject global function
        angular.forEach( results.data.products, function(product) {
          if(product.manufacturer) {
            var manufacturer = { name: product.manufacturer, slug: product.manufacturer.replace(/ /g, '-').toLowerCase(), url_name: product.manufacturer_url };
            if (window.indexOfObject( $scope.brands, manufacturer) === -1 ) {
              $scope.brands.push(manufacturer);
            }
          }
        });
        $scope.brands = $filter('orderBy')( $scope.brands, 'slug' ); //order alphabetically
      }
      $scope.categoryProducts = results.data.products;
      $scope.updateFilter();
    };

    var bannerLoad = function(currentCategory) {
      $scope.title = currentCategory.name;
      $scope.shortDescription = currentCategory.short_description;
      var background = encodeURI(currentCategory.background_image);
      $scope.setBackground = function(){
        return {
                'background-image':'url(' + background + ')'
            }
      }
    }

    var categoryInit = function(parent,child){
      $scope.brands = [];
      if (angular.isUndefined($scope.productCategories)) {
        getAllCategories(parent);
      }
      else {
        updateProductMenuTile(parent); //fetch and define categories if not done
      }
      //update filters
      $scope.filters.category = [parent,child];
      $scope.filters.brand = null;
      $scope.activeFilter = $scope.filters.category[1] ? $scope.filters.category[1] : $scope.filters.category[0];
      $location.path($scope.filters.category.join('/'));
    };

    $scope.updateCategory = function(category, child) {
      categoryInit(category,child);
      updateFilters();
    }

    $scope.getAllProducts = function(){
      $scope.productsLoading = true;
      ProductService.category(false, 0, $scope.productListLimit).then(function(results){
        $scope.brands = [];
        getAllCategories();

        //update filters
        $scope.filters.brand = null;
        $scope.currentCategory = { name: 'Categories' };
        setProducts(results);
      });
    };

    $scope.updateFilter = function(){
      /*
      var products = $scope.categoryProducts;
      //filter by search term
      if ($scope.filters.search){
        products = $filter('filter')( products, { 'name': $scope.filters.search });
      }

      //filter by category
      var category = $scope.filters.category.child ? $scope.filters.category.child : $scope.filters.category.parent;
      if (category){
        products = $filter('filter')( products, { 'categories': category } );
      }

      //filter by price
      if ($scope.filters.price){
        products = $filter('priceRange')( products, $scope.filters.price );
      }

      //filter by brand
      if ( $scope.filters.brand ){
        products = $filter('filter')(products, { 'manufacturer_url': $scope.filters.brand }, true);
      }

      //filter by sale items
      if ($scope.filters.sale ){
        products = $filter('filter')(products, { 'on_sale': true }, true);
      }
      */
      //paginate filtered products
      $scope.pagination();
    };

    $scope.$watch('filters', function(newFilters,oldFilters){
      if (newFilters !== oldFilters){
        $scope.activeFilter = $scope.filters.category[1] ? $scope.filters.category[1] : $scope.filters.category[0];
        $scope.updateFilter();
      }
    },true);

    var updateProductMenuTile = function(parent){
      $scope.currentCategory = $filter('filter')($scope.productCategories, { 'url_name': parent },true)[0];
      $scope.childCategories = $scope.currentCategory.children;
      bannerLoad($scope.currentCategory);
    };

    var getAllCategories = function(parent){
      //big list of all categories for dropdown menu
      CategoryService.all().then(function(results){
        $scope.productCategories = results.data.categories;
        if (!angular.isUndefined(parent)){
          updateProductMenuTile(parent);
        }
      });
    };


    $scope.$watch('productListLimit', function(newVal,oldVal){
      if (newVal !== oldVal){ $scope.pagination($scope.productList); }
    });

    //get the products filtered by category, then paginate them on the front-end
    $scope.pagination = function(){
      $scope.goToPage(1);
    };

    //pagination navigation across the nation
    $scope.goToPage = function(page){
      $scope.currentPage = page;
      var start = (page - 1) * $scope.productListLimit;
      ProductService.category($scope.filters.category[0],start,$scope.productListLimit).then(function(results){
        $scope.productList = results.data.products;
        $scope.numProducts = results.data.count;
        $scope.productsLoading = false;
        var pages = Math.ceil($scope.numProducts / $scope.productListLimit); //how many pages?
        $scope.newHeight(); //sets a min height of the container so it doesn't look weird
        $scope.pages = new Array(pages);
        });
    };

    getAllCategories();
    $scope.updateFilter();
  });



/**
 * @ngdoc filter
 * @name lsAngularApp.filter:priceRange
 * @function
 * @description
 * # priceRange
 * Filter in the lsAngularApp.
 */
angular.module('lsAngularApp')
  .filter('priceRange', function () {
    return function (products,maxPrice) {
      // finds the max price of an array of products
      if (maxPrice){
        var filteredItems = [];
        angular.forEach(products, function(product){
          if ( Number(product.price) <= maxPrice ){
            filteredItems.push(product);
          }
        });
        return filteredItems;
      }
      else {
        return products;
      }
    };
  });



/**
 * @ngdoc directive
 * @name lsAngularApp.directive:minHeight
 * @description
 * # minHeight
 */
angular.module('lsAngularApp')
  .directive('minHeight', function ($timeout, $mdMedia) {
    return {
      restrict: 'A',
      link: function postLink(scope, element) {
        //make the element as tall as when it first has content
        // * when switching product categories, the # of products changes
        // * so it doesn't look shrink and look bad, set the min-height of the container on load
        element.addClass('new-height-transition');
        scope.newHeight = function(){
          if (!$mdMedia('xs') && !$mdMedia('sm')){
            angular.element(element)[0].style.minHeight = 0;
            $timeout(function(){
              var currentHeight = element[0].clientHeight;
              angular.element(element)[0].style.minHeight = currentHeight+'px';
            },1000);
          }
        };

      }
    };
  });


/**
 * @ngdoc function
 * @name lsAngularApp.controller:ReviewDialogController
 * @description
 * # ReviewDialogController
 * Controller of the lsAngularApp
 */
  function ReviewDialogController($scope, $mdDialog, $rootScope) {
    $scope.hide = function() {
      $mdDialog.hide();
    };
    $scope.cancel = function() {
      $mdDialog.cancel();
    };
    $scope.submit = function(review) {
        if(review && review.email && review.email.length && review.title && review.message){
            $rootScope.showLoadingScreen();
            $mdDialog.hide(review);
        }else{
              return false;
        }
    };
  };

/**
 * @ngdoc function
 * @name lsAngularApp.controller:ProductCtrl
 * @description
 * # ProductCtrl
 * Controller of the lsAngularApp
 */
angular.module('lsAngularApp')
  .controller('ProductCtrl', function ($scope,ProductService,CartService,$filter,$window,$timeout,$http,$mdDialog) {
    var slug = $route.current.params.slug;

    $scope.writeReview = function(ev) {
      $mdDialog.show({
        controller: ReviewDialogController,
        template: reviewDialog, //HTML partial passed in from Twig
        parent: angular.element(document.body),
        targetEvent: ev,
        clickOutsideToClose:true
      });
    };

    $scope.current = $window.location.href;

    $scope.carouselIndex = 0;
    $scope.changeCarousel = function(index){
      $scope.carouselIndex = index;
    };

    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    };
    
    $scope.options = {};
    
    $scope.changeOption = function(id , key , value){
     var decodedOptions = [];
     var queryString = location.search.substr(1).split('&');
 
      $timeout(function(){
        if(queryString[0].length > 0){
    
            angular.forEach(queryString, function(arr, idx){
               var urlParam = arr.substr(0,arr.indexOf('='))
               var urlParamIndex = urlParam.match(/\d/g).join();
               var paramVal = getUrlParameter(urlParam);
               decodedOptions.push([urlParamIndex , paramVal, value]);
            });

            angular.forEach(decodedOptions, function(val , id){
                $scope.options[val[0]] = val[1];
                var selectableOption = angular.element('#selectable-option-'+ val[1] );
                angular.element('#selected-option-'+val[0] ).text(selectableOption.text());
            });
 
        }else{
         $scope.options[id] = key;
         var selectableOption = angular.element('#selectable-option-'+key );
         angular.element('#selected-option-'+id ).text(selectableOption.text());
        }
      },50);
    };
    

    $scope.updateSlug = function(key, id, value){
        
        var baseProductUrl = $window.location.href.split("?")[0];
        var optionString = "";

        angular.forEach($scope.options, function(v, k, context){
        optionString+='options['+id+']='+ key;
        })
        $timeout(function(){
             $window.location.href = baseProductUrl + '?'+ optionString;
        },100);
    }
    
    angular.forEach(reviews, function(review, index){
      //convert the 'n/5' rating to a number
      var rating = review.item_rating.split('/');
      reviews[index].item_rating = Number(rating[0].trim());
    });
    $scope.customerReviews = reviews;
    $scope.currentReview = 0;

    // to be removed, Twig does a lot of this
    ProductService.get(slug).then(function(result){
      $scope.product = result.data.product;
      $scope.product.favourite = CartService.isFavourite($scope.product);
      $scope.order = {
        id: $scope.product.id,
        name: $scope.product.name,
        images: $scope.product.images,
        short_description: $scope.product.short_description,
        price: $scope.product.price,
        on_sale: $scope.product.is_on_sale,
        discount: $scope.product.sale_price_or_discount,
        in_cart: CartService.isInCart(  {product: $scope.product } ),
        thumbnail: $scope.product.thumbnail,
        extras:{},
        quantity: (productQty ? productQty : 1)
      };
      angular.forEach($scope.product.options, function(option){
        $scope.order[option.name.toLowerCase()] = option.values[0]; //select the first option as the value
      });
    });

  });



  /**
   * @ngdoc function
   * @name lsAngularApp.controller:BlogCtrl
   * @description
   * # BlogCtrl
   * Controller of the lsAngularApp
   */
  angular.module('lsAngularApp')
    .controller('BlogCtrl', function ($scope,$timeout,BlogService) {

      // get all blog posts
      BlogService.all().then(function(results){
        $scope.blog = results.data.blog;
        $scope.categories = [];
        $scope.months = [];
        var dates = [];

        angular.forEach($scope.blog, function(post, index){
          // group the posts by date (for the archive panel)
            var publishDate = post.publish_date.replace(/-/g, "/");
            var d = Date.parse(publishDate);
            d = new Date(d);
            var month = d.getMonth() + 1;
            var year = d.getFullYear();
            var date = month +'/01/'+year;
            if (dates.indexOf(date) === -1){
              dates.push(date);
              $scope.months.push(new Date(date));
            }
            angular.forEach(post.categories, function(category, index){
              //pass to front-end archive list
              if ( $scope.categories.indexOf(category) === -1 ){
                $scope.categories.push(category);
               
              }
            })
        });
      });
    });



/**
 * @ngdoc function
 * @name lsAngularApp.controller:CheckoutCtrl
 * @description
 * # CheckoutCtrl
 * Controller of the lsAngularApp
 */
angular.module('lsAngularApp')
  .controller('CheckoutCtrl', function ($scope,$timeout,$compile,$rootScope) {

    // todo: remove jQuery dependency
    // write a function (or directive) which detects changes
    $(document).on('change', '#payment_method', function() {
      $rootScope.showLoadingScreen();
      $rootScope.$apply();

      $(this).sendRequest('shop:onUpdatePaymentMethod', {
        update: {'#payment_form' : 'partial-paymentform'},
        onAfterUpdate: function(e){}
      });
    });

    $scope.autoApplyShipping = function(shipping) {

        $timeout(function() {
            var shippingList = angular.element('#shipping_method_list');
            $scope.$apply();
            angular.element(shippingList).children()[0].click();
            angular.element('#select_shipping_continue').click();
        },250);
    };
  

    $scope.isAutoUpdatedPayment = false;
    
    $scope.autoUpdateSinglePaymentMethod = function() {
        if(!$scope.isAutoUpdatedPayment){
            $timeout(function() {
                var select = angular.element('#payment_method');
                var selectedVal = select.children()[1].value;
                select.val(selectedVal);
                select.change();
                $scope.isAutoUpdatedPayment = true;
            }, 500);
        }
    }

    
    $scope.isUpdateCoupon = false;

    $scope.nextStep = function(){
      $(window).on('onAjaxAfterUpdate onAjaxFailure', function(e){
        if(e.type !== 'onAjaxFailure') {
          if (typeof $('#checkout-page')[0] !== 'undefined'){
            $compile($('#checkout-page').contents())($scope);
            $scope.$digest();
          }
        }
        $(window).off('onAfterAjaxUpdate onAjaxFailure');
        $rootScope.hideLoadingScreen();
      });
      
    }

    //nothing to see here, move along
    $scope.shipping = {};
    $scope.billing = {};
    $scope.infoCopied = false;

    $scope.getValue = function(model,elem){
      $scope[model+'_name'] = $(elem+ ' option:selected').text().trim();
    };
    
    $scope.onCountryChange =function() {
        $timeout(function() {
            $scope.billing.state = "";
            if(angular.element('#billing_state').children().length === 1){
                $scope.billing.state = "";
            }else{
                $scope.billing.state = "";
            } 
            $scope.onStateChange();
            $scope.$apply();
        }, 500)
    };
    
    $scope.stateTextValue = "";
    
    $scope.onStateChange = function(){
      $timeout(function() {
          $scope.stateTextValue = angular.element('#billing_state option:selected').text().trim();
          $scope.$apply();
      });
    };
    
    $scope.initBillingIsShipping = function() {
        $timeout(function() {
            $scope.shippingIsBilling =  $scope.billing.street === $scope.shipping.street;
            $scope.$apply();
            $scope.shipping = $scope.billing;
        }, 1000);
    }
    
    $scope.$watch('shippingIsBilling', function(newval, oldval) {
        
        $scope.onStateChange();
        
        if(newval){
             $scope.shipping = $scope.billing;
        }else{
             $scope.shipping = {};
        }
    })
    
    function htmlDecode(input){
      var e = document.createElement('div');
      e.innerHTML = input;
      return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
    }
    
    $scope.parseTrackingCodes = function(orderid){
        angular.forEach(trackingCodes, function(code){
            if(code[0] == orderid){
             angular.element('#o_'+ orderid).html(htmlDecode(code[1]));
            }
        })
    }
  });



/**
 * @ngdoc directive
 * @name lsAngularApp.directive:compileOnChange
 * @description
 * # compileOnChange
 */
angular.module('lsAngularApp')
  .directive('compileOnChange', function ($window,$compile,$timeout,$rootScope) {
    return {
      restrict: 'A',
      link: function(scope,element,attrs){
        //after LS returns the AJAX request and updates the HTML, recompile Angular template
        element.on('change', function(){
          $(window).on('onAfterAjaxUpdate onAjaxFailure', function(e){
            if(e.type !== 'onAjaxFailure') {
              if (typeof $(attrs.compileOnChange)[0] !== 'undefined'){
                $compile(element)(scope);
                scope.$digest();
              }
            }
            $(window).off('onAfterAjaxUpdate onAjaxFailure');
            $rootScope.hideLoadingScreen();
          });
        })
      }
    }
  });

/**
 * @ngdoc directive
 * @name lsAngularApp.directive:compileOnClick
 * @description
 * # compileOnClick
 */
angular.module('lsAngularApp')
  .directive('compileOnClick', function ($window,$compile,$timeout,$rootScope) {
    return {
      restrict: 'A',
      link: function(scope,element,attrs,ctrl){
        //after LS returns the AJAX request and updates the HTML, recompile Angular template
        // * same as the compileOnChange directive, but is triggered by a click
        element.on('click', function(){
            $(window).on('onAfterAjaxUpdate onAjaxFailure', function(e){
              if(e.type !== 'onAjaxFailure') {
                var $elem = $($(attrs.compileOnClick)[0]);
                if (typeof $elem !== 'undefined'){
                  $timeout(function(){
                    var e = $(attrs.compileOnClick).contents();
                    $elem.empty().append($compile(e)(scope));
                  });
                }  
              }
              $(window).off('onAfterAjaxUpdate onAjaxFailure');
              $rootScope.hideLoadingScreen();
            });
        })
      }
    }
  });


/**
 * @ngdoc directive
 * @name lsAngularApp.directive:watchChange
 * @description
 * # watchChange
 */
angular.module('lsAngularApp')
  .directive('watchChange', function ($window,$compile,$timeout) {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope,element,attrs,ngModel){
        //watch the element for a model change, then trigger the .change() function so Lemonstand can update the product
        scope.$watch(function () {
           return ngModel.$modelValue;
        }, function(newValue,oldValue) {
            if (newValue !== oldValue){
              $timeout(function(){
                element.change();
              });
            }
        });
      }
    }
  });



/**
 * @ngdoc directive
 * @name lsAngularApp.directive:stars
 * @description
 * # stars
 */
angular.module('lsAngularApp')
  .directive('stars', function () {
    return {
      restrict: 'E',
      template: '<md-icon ng-repeat="star in stars track by $index" class="star icon-small" ng-class="{\'star-active\': star.filled }">[[ star.half ? \'star_half\' : \'star\']]</md-icon>',
      scope: {
          value: '=',
      },
      link: function (scope,element,attrs) {
        // generate a list of starts based on an integer value
        var generateStars = function(){
          scope.stars = [];
          if (attrs.value % 1 && (attrs.value % 1)*10 > 7){
            var whole = Math.ceil(attrs.value);
            var half = false;
          }
          else if ( attrs.value % 1 && (attrs.value % 1)*10 <= 7 ){
            var whole = Math.floor(attrs.value);
            var half = true;
          }
          else {
            var whole = Math.floor(attrs.value);
            var half = false;
          }
          var addedHalf = false;
          for (var i = 1; i <= 5; i++) {
              scope.stars.push({
                  filled: i <= Math.ceil(attrs.value),
                  half: whole < i && half && !addedHalf
              });

              if ( (i > whole) && half && !addedHalf ){
                addedHalf = true;
              }
          }
        };
        generateStars();

        scope.$watch('value',function(){
          generateStars();
        });

      }
    };
  });



/**
 * @ngdoc service
 * @name lsAngularApp.CartService
 * @description
 * # CartService
 * Service in the lsAngularApp.
 ************* TO BE REMOVED, LS DOES MOST OF THIS EXCEPT FAVOURITES *************
 */
angular.module('lsAngularApp')
  .service('CartService', function ($q,$window,$rootScope,$filter) {

    var $ls = $window.localStorage;

    var cartUpdated = function(cart){ $rootScope.$emit('cartUpdated', cart); };
    var favsUpdated = function(favs){ $rootScope.$emit('favsUpdated', favs); };

    this.addToCart = function(product){
      var deferred = $q.defer();
      var cart = !angular.isUndefined($ls.cart) ? JSON.parse($ls.cart) : [];
      var inCart = this.isInCart(product);
      if ( !inCart ){ cart.push(product); }
      $ls.cart = JSON.stringify(cart);
      cartUpdated(cart);
      deferred.resolve(cart);
      return deferred.promise;
    };

    this.removeFromCart = function(product){
      var deferred = $q.defer();
      var cart = [];
      if (!angular.isUndefined($ls.cart)){
        cart = JSON.parse($ls.cart);
        var inCart = $filter('filter')( cart, { 'id': product.id }, true )[0];
        var index = window.indexOfObject(cart,inCart);
        if ( index !== -1 ){
          cart.splice(index,1);
          $ls.cart = JSON.stringify(cart);
          deferred.resolve(cart);
        }
        else {
          deferred.reject();
        }
      }
      else {
        deferred.reject();
      }
      cartUpdated(cart);
      return deferred.promise;
    };

    this.cart = function(){
      var cart = !angular.isUndefined($ls.cart) ? JSON.parse($ls.cart) : [];
      cartUpdated(cart);
      return cart;
    };

    this.getLsCart = function(){
      var deferred = $q.defer();
      var items = cartItems ? cartItems : [];
      deferred.resolve(items);
      return deferred.promise;
    }

    this.isInCart = function(product){
      var cart = !angular.isUndefined($ls.cart) ? JSON.parse($ls.cart) : [];
      var inCart = $filter('filter')( cart , { 'id': product.id }, true );
      return inCart.length ? true : false;
    };


    this.addFavourite = function(product){
      var deferred = $q.defer();
      var favs = !angular.isUndefined($ls.favourites) ? JSON.parse($ls.favourites) : [];
      var isFav = window.indexOfObject(favs,product);
      if ( isFav === -1 ){ favs.push(product); }
      $ls.favourites = JSON.stringify(favs);
      favsUpdated(favs);
      deferred.resolve(favs);
      return deferred.promise;
    };

    this.removeFavourite = function(product){
      var deferred = $q.defer();
      if (!angular.isUndefined($ls.favourites)){
        var favs = JSON.parse($ls.favourites);
        var isFav = $filter('filter')( favs, { 'id': product.id }, true )[0];
        var index = window.indexOfObject(favs,isFav);
        if ( index !== -1 ){
          favs.splice(index,1);
          $ls.favourites = JSON.stringify(favs);
          favsUpdated(favs);
          deferred.resolve(favs);
        }
        else {
          deferred.reject();
        }
      }
      else {
        deferred.reject();
      }
      return deferred.promise;
    };

    this.isFavourite = function(product){
      var favs = !angular.isUndefined($ls.favourites) ? JSON.parse($ls.favourites) : [];
      var isFav = $filter('filter')( favs , { 'id': product.id }, true );
      return isFav.length ? true : false;
    };

    this.favourites = function(){
      var favs = !angular.isUndefined($ls.favourites) ? JSON.parse($ls.favourites) : [];
      favsUpdated(favs);
      return favs;
    };
  });



/**
 * @ngdoc filter
 * @name lsAngularApp.filter:trailingZero
 * @function
 * @description
 * # trailingZero
 * Filter in the lsAngularApp.
 */
angular.module('lsAngularApp')
  .filter('trailingZero', function () {
    return function (input) {
      // how to get the clean-looking prices (eg. '$99' instead of '$99.00'), unless it has a float
      input = input % 1 !== 0 ? Math.floor( input ) + '.' + Math.floor((input % 1)*100) : input;
      return input;
    };
  });



/**
 * @ngdoc filter
 * @name lsAngularApp.filter:urlencode
 * @function
 * @description
 * # urlencode
 * Filter in the lsAngularApp.
 */
angular.module('lsAngularApp')
  .filter('urlencode', function ($window) {
    return function (input) {
      return $window.encodeURIComponent(input);
    };
  });

  angular.module('lsAngularApp')
    .controller('CreditCardCtrl', function($scope,$locale) {
      $scope.currentYear = new Date().getFullYear();
      $scope.currentMonth = new Date().getMonth() + 1;
      $scope.months = $locale.DATETIME_FORMATS.MONTH;
      $scope.ccinfo = {type:undefined};
    });

  angular.module('lsAngularApp')
  .directive('creditCardType', function(){
    return {
      require: 'ngModel',
      link: function(scope, elm, attrs, ctrl){
        ctrl.$parsers.unshift(function(value){
          //figures out the type of credit card based on number patterns
          scope.ccinfo.type =
            (/^5[1-5]/.test(value)) ? 'MASTERCARD'
            : (/^4/.test(value)) ? 'VISA'
            : (/^3[47]/.test(value)) ? 'AMEX'
            // : (/^6011|65|64[4-9]|622(1(2[6-9]|[3-9]\d)|[2-8]\d{2}|9([01]\d|2[0-5]))/.test(value)) ? 'DISCOVER'
            : undefined;
          ctrl.$setValidity('invalid',!!scope.ccinfo.type)
          return value;
        })
      }
    };
  })

  angular.module('lsAngularApp')
    .directive('cardExpiration', function(){
      return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl){
          scope.$watch('[ccinfo.month,ccinfo.year]',function(value){
            //knows if the card has expired or not
            ctrl.$setValidity('invalid',true);
            if ( scope.ccinfo.year == scope.currentYear && scope.ccinfo.month <= scope.currentMonth) {
              ctrl.$setValidity('invalid',false);
            }
            return value;
          },true);
        }
      };
    })

  angular.module('lsAngularApp')
    .filter('range', function() {
      return function(arr, lower, upper) {
        for (var i = lower; i <= upper; i++) {
          arr.push(i);
        }
        return arr;
      }
    })
