(function() {
    'use strict';

    angular.module('adminApplication')
        .service('PollService', ['$http', 'HttpErrorHandler', '$uibModal', PollService])
        .component('polls', {
            bindings: {
                event:'<'
            },
            controller: function() {},
            templateUrl: '../resources/js/admin/feature/polls/index.html'
        })
        .component('pollsList', {
            bindings: {
                event:'<'
            },
            controller: ['$uibModal', 'PollService', PollListCtrl],
            templateUrl: '../resources/js/admin/feature/polls/polls-list.html'
        })
        .component('pollEdit', {
            bindings: {
                event:'<'
            },
            controller: ['PollService', 'EventService', '$state', '$stateParams', '$q', PollEditCtrl],
            templateUrl: '../resources/js/admin/feature/polls/poll-edit.html'
        })
        .component('pollDetail', {
            bindings: {
                event:'<'
            },
            controller: ['PollService', 'EventService', '$q', '$stateParams', PollDetailCtrl],
            templateUrl: '../resources/js/admin/feature/polls/poll-detail.html'
        });


    function PollListCtrl($uibModal, PollService) {
        var ctrl = this;
        ctrl.polls = [];
        ctrl.$onInit = function() {
            PollService.loadListForEvent(ctrl.event.shortName).then(function(resp) {
                ctrl.polls = resp.data;
                ctrl.getFirstLang = function(obj) {
                    if(!obj) {
                        return "";
                    }
                    var keys = Object.keys(obj);
                    return obj[keys[0]];
                };
            });

        }
    }

    function PollEditCtrl(PollService, EventService, $state, $stateParams, $q) {
        var ctrl = this;
        var keys;
        ctrl.$onInit = function() {
            var promises = [EventService.getSupportedLanguages()];
            if($stateParams.pollId) {
                promises.push(PollService.loadForEvent(ctrl.event.shortName, $stateParams.pollId))
            } else {
                promises.push($q.resolve({
                    data: {
                        accessRestricted: false,
                        title: {},
                        description: {},
                        order: 0,
                        options: [
                        ]
                    }
                }));
            }
            $q.all(promises).then(function(results) {
                keys = Object.keys(ctrl.event.description)
                ctrl.languages = results[0].data.filter(function(l) {
                    return _.includes(keys, l.locale);
                });
                ctrl.poll = results[1].data;
            });
        };

        ctrl.getFirstLang = function(option) {
            if(!option) {
                return "";
            }
            return option[keys[0]];
        };

        ctrl.getAdditionalTranslations = function() {
            return keys.length - 1;
        };

        ctrl.editOption = function(option, index) {
            PollService.editOption(option, ctrl.languages).then(function(newVersion) {
                ctrl.poll.options[index] = newVersion;
            });
        };

        ctrl.addOption = function() {
            PollService.editOption({}, ctrl.languages).then(function(newVersion) {
                ctrl.poll.options.push(newVersion);
            });
        };

        ctrl.save = function(form, poll) {
            if(!form.$valid || poll.options.length === 0) {
                return;
            }
            PollService.createNew(ctrl.event.shortName, poll).then(function(resp) {
                $state.go('events.single.polls-detail', { eventName: ctrl.event.shortName, pollId: resp.data })
            });
        };
    }

    function PollDetailCtrl(PollService, EventService, $q, $stateParams) {
        var ctrl = this;
        ctrl.$onInit = function() {
            $q.all([PollService.loadForEvent(ctrl.event.shortName, $stateParams.pollId), EventService.getSupportedLanguages()]).then(function(res) {
                var keys = Object.keys(ctrl.event.description)
                ctrl.languages = res[1].data.filter(function(l) {
                    return _.includes(keys, l.locale);
                });
                initPollObj(res[0].data);

                ctrl.getFirstLang = function(option) {
                    if(!option) {
                        return "";
                    }
                    return option[keys[0]];
                };

                ctrl.getAdditionalTranslations = function() {
                    return keys.length - 1;
                };
            });

            var initPollObj = function(poll) {
                ctrl.poll = poll;
                ctrl.draft = poll.status === 'DRAFT';
                ctrl.closed = poll.status === 'CLOSED';
                ctrl.open = poll.status === 'OPEN';
            };

            ctrl.changePollStatus = function() {
                var newStatus = ctrl.open ? 'CLOSED' : 'OPEN';
                PollService.updateStatus(ctrl.event.shortName, ctrl.poll.id, newStatus).then(function(res) {
                    initPollObj(res.data);
                });
            };
        }

    }

    function PollService($http, HttpErrorHandler, $uibModal) {
        var self = this;
        return {
            loadListForEvent: function(eventName) {
                return $http.get('/admin/api/'+eventName+'/poll').error(HttpErrorHandler.handle);
            },
            loadForEvent: function(eventName, pollId) {
                return $http.get('/admin/api/'+eventName+'/poll/'+pollId).error(HttpErrorHandler.handle);
            },
            createNew: function(eventName, poll) {
                return $http.post('/admin/api/'+eventName+'/poll', poll).error(HttpErrorHandler.handle);
            },
            updateStatus: function(eventName, pollId, newStatus) {
                return $http['put']('/admin/api/'+eventName+'/poll/'+pollId, { status: newStatus })
                    .error(HttpErrorHandler.handle);
            },
            editOption: function(option, languages) {
                var modal = $uibModal.open({
                    size: 'lg',
                    templateUrl: '../resources/js/admin/feature/polls/edit-option-modal.html',
                    backdrop: 'static',
                    controllerAs: '$ctrl',
                    controller: function ($scope) {
                        this.option = angular.copy(option);
                        this.languages = languages;
                        this.addNew = !option.id || option.title.length === 0;
                        this.editOption = function(form, obj) {
                            if(form.$valid && option.id) {
                                console.log('TODO update');
                                $scope.$close(obj);
                            } else if(form.$valid) {
                                $scope.$close(obj);
                            }
                        };
                        this.cancel = function() {
                            $scope.$dismiss();
                        };
                    }
                });
                return modal.result;
            }
        }
    }

})();