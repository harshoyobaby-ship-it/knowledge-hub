from cuid2 import cuid_wrapper

_generate = cuid_wrapper()


def new_id() -> str:
    return _generate()
