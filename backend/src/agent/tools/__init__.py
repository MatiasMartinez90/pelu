from .actions import (
    confirm_pending_action,
    prepare_booking,
    prepare_cancel,
    prepare_reschedule,
)
from .booking import check_availability, get_my_bookings
from .catalog import get_barbers, get_services
from .handoff import handoff_to_human

ALL_TOOLS = [
    get_services,
    get_barbers,
    check_availability,
    prepare_booking,
    get_my_bookings,
    prepare_reschedule,
    prepare_cancel,
    confirm_pending_action,
    handoff_to_human,
]
