import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../config'

const ShopkeeperLogout = () => {
    const navigate = useNavigate()

    useEffect(() => {
        const token = localStorage.getItem('token')

        axios.get(`${API_BASE_URL}/shopkeepers/logout`, {
            headers: { Authorization: `Bearer ${token}` }
        }).finally(() => {
            localStorage.removeItem('token')
            navigate('/shopkeeper-login')
        })
    }, [])

    return <div>Logging out...</div>
}

export default ShopkeeperLogout
