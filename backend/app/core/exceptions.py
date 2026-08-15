class AppException(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class EntityNotFoundException(AppException):
    pass

class DuplicateEntityException(AppException):
    pass

class BusinessValidationException(AppException):
    pass
