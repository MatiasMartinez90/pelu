"""Obtención de IP real sin confiar ciegamente en headers reenviados."""

from ipaddress import ip_address, ip_network

from fastapi import Request

from ..config import get_settings


def get_client_ip(request: Request) -> str:
    peer = request.client.host if request.client else "unknown"
    networks = []
    try:
        peer_ip = ip_address(peer)
        networks = [
            ip_network(cidr.strip())
            for cidr in get_settings().trusted_proxy_cidrs.split(",")
            if cidr.strip()
        ]
        trusted = any(peer_ip in network for network in networks)
    except ValueError:
        trusted = False

    if not trusted:
        return peer

    forwarded = request.headers.get("x-forwarded-for", "")
    chain = [part.strip() for part in forwarded.split(",") if part.strip()]
    # Recorremos desde el peer hacia el cliente y descartamos sólo hops
    # confiables. Tomar el primer valor permitiría spoofing si el proxy agrega
    # X-Forwarded-For a un header enviado por el atacante.
    for candidate in reversed(chain):
        try:
            candidate_ip = ip_address(candidate)
        except ValueError:
            continue
        if any(candidate_ip in network for network in networks):
            continue
        return str(candidate_ip)
    return peer
