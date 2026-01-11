import { Product } from "../models/productModel.js";
import getDataUri from "../utils/dataUri.js";
import cloudinary from "../utils/cloudinary.js";

export const addProduct = async (req, res) => {
    try {
        console.log("FILES:", req.files); // 👈 ADD THIS LINE HERE
        const { productName, productDesc, productPrice, category, brand } = req.body;
        const userId = req.id;

        if (
            !productName ||
            !productDesc ||
            productPrice === undefined ||
            !category ||
            !brand
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one product image is required",
            });
        }

        let productImg = [];

        for (let file of req.files) {
            const fileUrl = getDataUri(file);

            const result = await cloudinary.uploader.upload(
                fileUrl.content,
                { folder: "mern_products" }
            );

            productImg.push({
                url: result.secure_url,
                public_id: result.public_id,
            });
        }

        const newProduct = await Product.create({
            userId,
            productName,
            productDesc,
            productPrice,
            category,
            brand,
            productImg,
        });

        return res.status(201).json({
            success: true,
            message: "Product added successfully!",
            product: newProduct,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getAllProduct = async (_, res) => {
    try {
        const products = await Product.find()
        if (!products) {
            return res.status(404).json({
                success: false,
                message: "No product available",
                products: []
            })
        }
        return res.status(200).json({
            success: true,
            products
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
export const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Delete images from Cloudinary
        if (product.productImg && product.productImg.length > 0) {
            for (let img of product.productImg) {
                await cloudinary.uploader.destroy(img.public_id);
            }
        }

        // Delete product from MongoDB
        await Product.findByIdAndDelete(productId);

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateProduct = async (req, res) => {
    try {

        const { productId } = req.params;
        const { productName, productDesc, productPrice, category, brand, existingImages } = req.body;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        let updatedImages = [];
        // keep selected old images
        if (existingImages) {

            const keepIds = JSON.parse(existingImages);
            updatedImages = product.productImg.filter((img) =>
                keepIds.includes(img.public_id)
            );
            // delete removed images from cloudinary
            const removedImages = product.productImg.filter(
                (img) => !keepIds.includes(img.public_id)
            );
            for (let img of removedImages) {
                await cloudinary.uploader.destroy(img.public_id);
            }
        } else {
            // keep all images if nothing sent
            updatedImages = product.productImg;
        }
        // upload new images if any
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                const fileUri = getDataUri(file);
                const result = await cloudinary.uploader.upload(fileUri, {
                    folder: "mern_products",
                });
                updatedImages.push({
                    url: result.secure_url,
                    public_id: result.public_id,
                });
            }
        }
        // update product fields
        product.productName = productName || product.productName;
        product.productDesc = productDesc || product.productDesc;
        product.productPrice = productPrice || product.productPrice;
        product.category = category || product.category;
        product.brand = brand || product.brand;
        product.productImg = updatedImages;
        await product.save();
        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
