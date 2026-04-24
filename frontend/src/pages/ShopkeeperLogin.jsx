import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../config'
import { ShopkeeperDataContext } from '../context/ShopkeeperContext'

const ShopkeeperLogin = () => {
    const navigate = useNavigate()
    const { setShopkeeper } = useContext(ShopkeeperDataContext)

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const submitHandler = async (e) => {
        e.preventDefault()
        const payload = { email, password }

        const response = await axios.post(`${API_BASE_URL}/shopkeepers/login`, payload)

        if (response.status === 200) {
            const data = response.data
            setShopkeeper(data.shopkeeper)
            localStorage.setItem('token', data.token)
            navigate('/shopkeeper-home')
        }
    }

    return (
        <div className='p-7 h-screen flex flex-col justify-between'>
            <div>
                <div className='text-2xl font-semibold mb-3'>Shopkeeper Panel</div>

                <form onSubmit={submitHandler}>
                    <h3 className='text-lg font-medium mb-2'>Email</h3>
                    <input
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
                        type='email'
                        placeholder='email@example.com'
                    />

                    <h3 className='text-lg font-medium mb-2'>Password</h3>
                    <input
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
                        type='password'
                        placeholder='password'
                    />

                    <button className='bg-[#111] text-white font-semibold mb-3 rounded-lg px-4 py-2 w-full text-lg'>Login</button>
                </form>

                <p className='text-center'>New shop? <Link to='/shopkeeper-signup' className='text-blue-600'>Register here</Link></p>
            </div>

            <div>
                <Link
                    to='/login'
                    className='bg-[#d5622d] flex items-center justify-center text-white font-semibold mb-5 rounded-lg px-4 py-2 w-full text-lg'
                >Sign in as User</Link>
            </div>
        </div>
    )
}

export default ShopkeeperLogin
