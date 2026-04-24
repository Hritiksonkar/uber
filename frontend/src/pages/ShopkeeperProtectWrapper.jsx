import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../config'
import { ShopkeeperDataContext } from '../context/ShopkeeperContext'

const ShopkeeperProtectWrapper = ({ children }) => {
    const token = localStorage.getItem('token')
    const navigate = useNavigate()
    const { setShopkeeper } = useContext(ShopkeeperDataContext)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!token) {
            navigate('/shopkeeper-login')
            return
        }

        axios.get(`${API_BASE_URL}/shopkeepers/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then((response) => {
            if (response.status === 200) {
                setShopkeeper(response.data.shopkeeper)
                setIsLoading(false)
            }
        }).catch(() => {
            localStorage.removeItem('token')
            navigate('/shopkeeper-login')
        })
    }, [token])

    if (isLoading) return <div>Loading...</div>

    return (
        <>
            {children}
        </>
    )
}

export default ShopkeeperProtectWrapper
