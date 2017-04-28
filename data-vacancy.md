# The Data Vacancy Pattern

**Summary:** The data vacancy pattern addresses the question of where and how to handle data-fetching in an app by treating the state of the rendered UI as the canonical system of record for fetch-needs.

## Data Vacancies

Typically, if the user views the detail screen for product "p1234", we perform a data fetch, then render a vacancy to the screen while the fetch is in-flight. This vacancy might be an empty div with a spinner CSS background.

In the data vacancy pattern, we flip that around. We render a vacancy to the screen, which triggers a data fetch.

## The Problem

Model-view-update (MVU) apps such as Redux or Elm lack a good story for data fetching. Typically, such logic is bolted on as a side effect to the model, view, or updater. Doing so saddles those modules with extra concerns and introduces strong coupling, which makes them harder to reason about and complicates unit testing.

MVU architecture meanwhile meshes will with the concept of *subscriptions*. These out-of-band processes feed the updater from sources like web sockets or viewport resize events. If data-fetching doesn't belong in the model, view, or updater, we turn our attention to subscriptions as a possible solution.

## Subscriptions

Unburdened of the requirement to do data-fetching, our app reverts to the pristine simplicity of MVU. We then imagine a scenario in which data-needs are magically fulfilled via some subscription X, and work backward from there. How do we solve for X?

## Solving for X

If a view renders data point XYZ, the render tree would comprise one of two things—a vacancy or a non-vacancy—depending on whether XYZ was present.

In our X module, we monitor the UI for vacancies. If found, we perform a data fetch, emitting subscription events as necessary, which are handled by our updater.

This causes the XYZ data point to no longer be undefined, which in turn causes the view to no longer render a data vacancy.
