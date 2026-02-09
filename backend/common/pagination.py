"""
Shared pagination classes.

Provides a single StandardPagination class used across all ViewSets
so the response shape ({items, total, page, page_size, total_pages})
is consistent and defined in one place.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """Standard pagination with configurable page size."""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'items': data,
            'total': self.page.paginator.count,
            'page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'total_pages': self.page.paginator.num_pages,
        })
