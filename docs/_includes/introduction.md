{{ site.data.project.title }} {#introduction}
============
[![Build Status](https://img.shields.io/travis/{{ site.data.project.github }}.svg?style=flat-square&branch=master)](https://travis-ci.org/{{ site.data.project.github }}){:class="shield"}
[![Coverage](https://img.shields.io/codecov/c/github/{{ site.data.project.github }}/master.svg?style=flat-square)](https://codecov.io/gh/{{ site.data.project.github }}){:class="shield"}
[![Latest Version](https://img.shields.io/npm/v/{{ site.data.project.npm }}.svg?style=flat-square)](https://www.npmjs.com/package/{{ site.data.project.npm }}){:class="shield"}
[![License](https://img.shields.io/npm/l/{{ site.data.project.npm }}.svg?style=flat-square)](https://github.com/{{ site.data.project.github }}/blob/master/LICENSE){:class="shield"}

---

<a class="source" href="https://github.com/{{ site.data.project.github }}">
    <img src="{{ site.baseurl }}/assets/images/github.png">
    FiguredLimited/vue-mc
</a>


This package aims to make data and state management **easier**, **safer** and **more consistent**. Vue does not provide data structures like these, so most projects use plain JS objects to store component data, as well as manual HTTP/state logic around them. For very basic apps, this is plenty, but we soon started to realise that we're writing the same pattern over and over again.

There are three common data states to manage:
- **Empty** state, like a blank form or new item.
- **Active** state, often bound to form inputs, used for editing on-the-fly.
- **Saved** state, which represents the source of truth of the data.

There are also four common element states: **loading**, **saving**, **deleting** and **fatal**.

The relationship between these data states, component states, and the actions that affect them is a fundamental and unavoidable layer to manage when building a component or application. We noticed that every team had a slightly different way of doing this,
so we decided to develop a standard solution that is flexible enough to accommodate most
use cases in a consistent way, while preserving reactivity and testability.

The basic concept is that of a `Model` and a `Collection` of models. Data and component state is managed automatically, and CRUD is built-in. A classic example would be a to-do list, where each task would be a model and the list of tasks would be a collection.

