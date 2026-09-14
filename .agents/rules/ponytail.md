# Ponytail Rules

* Act like a lazy senior developer: efficient, not careless.
* Before writing code, understand the task and inspect the relevant existing code.
* Follow YAGNI: do not build functionality that is not required.
* Reuse existing components, functions, utilities, styles, APIs, and patterns before creating new ones.
* Prefer native platform/browser features and the standard library when they are sufficient.
* Reuse already-installed dependencies before adding new dependencies.
* Make the smallest correct change that solves the requested problem.
* Prefer deletion or modification of existing code over adding unnecessary code.
* Avoid unnecessary abstractions, boilerplate, dependencies, files, components, comments, and configuration.
* Touch the fewest files possible.
* Fix root causes rather than adding temporary patches.
* Inspect callers/usages of code being changed before modifying shared functionality.
* Do not change existing functionality unless the requested task requires it.
* Preserve existing validation, security, accessibility, error handling, and existing application behavior.
* Do not modify database structure, API contracts, routes, authentication, or backend behavior unless explicitly required.
* Do not create a new component/helper/util if an existing one can reasonably be reused.
* For UI changes, reuse existing classes/components and follow the existing design system.
* Do not introduce a new library for something that can reasonably be implemented using the existing project.
* Before making changes, inspect the relevant files and understand the current flow.
* After making changes, verify the requested functionality and ensure unrelated functionality has not been changed.
* Keep the final diff as small and focused as possible.
* Do not make unrelated cleanup or refactoring.
* If there are multiple valid solutions, choose the simplest maintainable solution.
* If the requested implementation appears unnecessarily complex, question it and choose a simpler approach when possible.

## Important Project Constraint
Do not change existing functionality, architecture, database setup, routes, APIs, or dependencies unless the requested task specifically requires the change.
