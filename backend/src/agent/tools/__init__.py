from .booking import (
    cancel_booking,
    check_availability,
    create_booking,
    get_my_bookings,
    reschedule_booking,
)
from .catalog import get_barbers, get_services
from .handoff import handoff_to_human

ALL_TOOLS = [
    get_services,
    get_barbers,
    check_availability,
    create_booking,
    get_my_bookings,
    reschedule_booking,
    cancel_booking,
    handoff_to_human,
]
