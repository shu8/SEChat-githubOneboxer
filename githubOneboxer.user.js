// ==UserScript==
// @name         SE Chat Github Oneboxer
// @namespace    http://stackexchange.com/users/4337810/
// @version      1.1
// @description  Oneboxes links to Github repos, issues, or pull requests in Chat
// @author       ᔕᖺᘎᕊ (http://stackexchange.com/users/4337810/)
// @match        *://chat.stackoverfow.com/*
// @match        *://chat.meta.stackexchange.com/*
// @match        *://chat.stackexchange.com/*
// @require      http://timeago.yarp.com/jquery.timeago.js
// @grant        none
// ==/UserScript==
$('head').append('<link rel="stylesheet" type="text/css" href="https://cdn.rawgit.com/shu8/SEChat-githubOneboxer/master/style.css">'); //add stylesheet to head (CSS from http://meta.stackexchange.com/q/243259/260841)

function replaceVars(url, details) { //Replace the {placeholders} with their actual values from the details array
    return url.replace(/{username}/, details.username).replace(/{repo_name}/, details.repo_name).replace(/{issue_number}/, details.issue_number).replace(/{pull_number}/, details.pull_number);
}

function useApi(url, details, callback) { //use the Github API to get the info
    $.ajax({
        url: replaceVars(url, details), //the URL should be the replaced version
        headers: {
            "Accept": "application/vnd.github.VERSION.html", //to get HTML versions of body, and not markdown
            "User-Agent": "shu8" //https://developer.github.com/v3/#user-agent-required
        },
        success: function(data) {
            callback(data);
        }
    });
}

function extractFromUrlAndGetInfo(link, $obj) { //to avoid repetition (for existing/new messages), a function to call getInfo with correct parameters 
    var info = link.split('github.com')[1];
    var username = info.split('/')[1],
        repo_name = info.split('/')[2],
        issue_number, pull_number;

    if (link.indexOf('issues') > -1) { //for issues
        issue_number = info.split('/')[4];
        getInfo('issue', { //get issue info via the API
            username: username, //with the variables
            repo_name: repo_name,
            issue_number: issue_number
        }, $obj); //pass on the jQuery element we need to onebox
    } else if (link.indexOf('pull') > -1) { //for pull requests
        pull_number = info.split('/')[4];
        getInfo('pull', { //get pull info via the API
            username: username, //with the variables
            repo_name: repo_name,
            pull_number: pull_number
        }, $obj); //pass on the jQuery element we need to onebox
    } else {
        getInfo('repo', { //get repo info via the API
            username: username, //with the variables
            repo_name: repo_name
        }, $obj); //pass on the jQuery element we need to onebox
    }
}

function getInfo(type, details, $element) {
    switch (type) {
        case 'issue': //for issues
            useApi("https://api.github.com/repos/{username}/{repo_name}/issues/{issue_number}", details, function(data) { //sends URL with placeholders to useApi and a callback follows:
                var body = $(data.body_html).find('img').remove().end().text(), //remove images from the body
                    title = data.title,
                    number = data.number,
                    opener = data.user.login,
                    creationTime = data.created_at,
                    url = data.html_url,
                    comments = data.comments,
                    avatar = data.user.avatar_url,
                    assignee = (data.assignee == null ? '<span class="milestone">not yet assigned</span>' : '<span class="milestone">assigned to <a href="'+data.assignee.url+'">'+data.assignee.login+'</a></span>'), //not a milestone, but same CSS, so same class as milestone!
                    labels = (data.labels == null ? '' : data.labels),
                    milestone = (data.milestone == null ? '<span class="milestone">no milestone</span>' : '<span class="milestone">'+data.milestone.title+' milestone</span>'); //get milestones; surround with span
                
                var labelSpan = ''; //get labels and suround them with spans for their own colour
                if(labels!='') {
                    $.each(labels, function(i,o) {
                        labelSpan += "<span class='label' style='background-color:#"+o.color+";'>"+o.name+"</span>"; 
                    });
                }
                
                if (body.length > 519) { //trim the body if it's >= 520
                    body = body.substr(0, 520);
                };
                $element.html("<div class='ob-github ob-github-main'>" + //make the onebox
                    "<img title='" + opener + "' src='" + avatar + "'>" +
                    "<a href='" + url + "' class='title'>" +
                    "<span class='title'>" + title + "</span></a>" +
                    "&nbsp;<span class='id'>#" + number + "</span>" + (labelSpan!='' ? labelSpan + milestone : milestone) + //if no labels, show milestone, else, show both
                    "<div class='ob-github-main-info'>" +
                    "<span class='author'>" + opener + "</span> opened this issue " +
                    "<time class='timeago' datetime='" + creationTime + "' is='relative-time'></time>." +
                    assignee + "<br><p>" +
                    body + "<span class='comments'>&nbsp;" + comments + " comments</span></p></div>" +
                    "</div>");
                $("time.timeago").timeago();
            });
            break;
        case 'repo': //for repos
            useApi("https://api.github.com/repos/{username}/{repo_name}", details, function(data) {
                var owner = data.owner.login,
                    name = data.name,
                    description = data.description,
                    url = data.url,
                    avatar = data.owner.avatar_url,
                    creationTime = data.created_at;
                $element.html("<div class='ob-github ob-github-main'>" + //make the onebox
                    "<img title='" + owner + "' src='" + avatar + "'>" +
                    "<a href='" + url + "' class='title'>" +
                    "<span class='title'>" + name + "</span></a>" +
                    "<div class='ob-github-main-info'>" +
                    "<span class='author'>" + owner + "</span> made this repo " +
                    "<time class='timeago' datetime='" + creationTime + "' is='relative-time'></time><p>" +
                    "<p>" + description + "</p></div>" +
                    "</div>");
                $("time.timeago").timeago();
            });
            break;
        case 'pull': //for pull requests
            useApi("https://api.github.com/repos/{username}/{repo_name}/pulls/{pull_number}", details, function(data) {
                var title = data.title,
                    body = $(data.body_html).find('img').remove().end().text(), //remove images from the body
                    number = data.number,
                    url = data.url,
                    creator = data.user.login,
                    creationTime = data.created_at,
                    avatar = data.head.user.avatar_url,
                    comments = data.comments;

                $element.html("<div class='ob-github ob-github-main'>" +
                    "<img title='" + creator + "' src='" + avatar + "'>" +
                    "<a href='" + url + "' class='title'>" +
                    "<span class='title'>" + title + "</span></a>" +
                    "&nbsp;<span class='id'>#" + number + "</span>" +
                    "<div class='ob-github-main-info'>" +
                    "<span class='author'>" + creator + "</span> submitted this pull request " +
                    "<time class='timeago' datetime='" + creationTime + "' is='relative-time'></time><br><p>" +
                    body + "<span class='comments'>&nbsp;" + comments + " comments</span></p></div>" +
                    "</div>");
                $("time.timeago").timeago();
            });
            break;
    }
}

var observer = new MutationObserver(function(mutations) { //MutationObserver
    mutations.forEach(function(mutation) {
        var i;
        for (i = 0; i < mutation.addedNodes.length; i++) {
            var $addedNode = $(mutation.addedNodes[i]);
            if ($addedNode.hasClass('message')) { //if the new node is a message
                if ($addedNode.find('a').length) { //if there is a link in the message
                    if ($addedNode.find('a:last').attr('href').indexOf('github') > -1) { //if the link is to github
                        var link = $addedNode.find('a:last').attr('href'); //get the link
                        extractFromUrlAndGetInfo(link, $addedNode); //pass URL and added node to the function which will go on to call useApi and add the onebox
                    }
                }
            }
        }
    });
});

setTimeout(function() {
    $('.message').each(function() { //loop through EXISTING messages to find oneboxable messages
        if ($(this).find('a[href*="github.com"]').length) {
            var link = $(this).find('a[href*="github.com"]').attr('href');
            extractFromUrlAndGetInfo(link, $(this)); //pass URL and message to the function which will go on to call useApi and add the onebox
        }
    });
    setTimeout(function() { //use the timeago plugin to add relative times to the onebox for EXISTING messages
        $("time.timeago").timeago();
    }, 1000);

    observer.observe($('#chat')[0], { //observe with the mutation observer for NEW messages
        childList: true,
        subtree: true
    });
}, 1000);
