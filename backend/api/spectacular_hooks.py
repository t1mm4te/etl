def postprocess_auth_tags(result, generator, **kwargs):
    """
    Постобработка готовой OpenAPI-схемы: назначает тег
    'Пользователи' всем путям, содержащим /auth/ или /users/.
    """
    paths = result.get('paths', {})
    for path, methods in paths.items():
        if '/auth/' in path or '/users/' in path:
            for method_data in methods.values():
                if isinstance(method_data, dict):
                    method_data['tags'] = ['Пользователи']
    return result
