const { Album } = require('../models');
const albumService = require('../services/album.service');

const getAllAlbums = async (req, res, next) => {
    try {
        const albums = await albumService.getAllAlbums();
        res.status(200).json({
            message: 'Lấy danh sách album thành công',
            data: albums,
        });
    } catch (error) {
        next(error);
    }
};

const createAlbum = async (req, res, next) => {
    try {
        const newAlbum = await albumService.createAlbum(req.body);

        res.status(200).json({
            message: 'Tạo album thành công.',
            data: newAlbum,
        });
    } catch (error) {
        next(error);
    }
};


const updateAlbum = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updatedAlbum = await albumService.updateAlbum(id, req.body);
        res.status(200).json({
            message: 'Cập nhật album thành công.',
            data: updatedAlbum,
        });
    } catch (error) {
        next(error);
    }
};


const deleteAlbum = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await albumService.deleteAlbum(id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllAlbums,
    createAlbum,
    updateAlbum,
    deleteAlbum,
};