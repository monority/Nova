# NOVA — Construction

## Construction lifecycle
A buildable object should have explicit states where useful:

`planned → under construction → operational → disabled/abandoned`

## Construction is not operation
A completed mesh is not automatically a functioning service.

Example:
- House exists physically.
- Construction is complete.
- House passes operational requirements.
- House contributes housing capacity.

This separation prevents future power/water/maintenance systems from becoming booleans hidden inside building entities.

## Future extension
Construction can later consume money, materials, labor and time. None of these should be implemented until the corresponding systems exist.
