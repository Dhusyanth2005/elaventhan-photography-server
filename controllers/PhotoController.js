const { getFilesFromFolder } = require('../utils/driveHelper');
const PhotoSelection = require('../models/photoSelection');

const getUserGallery = async (req, res) => {
  const user = await require('../models/User').findById(req.user.id);
  if (!user.folderId) return res.status(404).json({ message: 'No folder assigned' });

  try {
    const photos = await getFilesFromFolder(user.folderId);
    res.json(photos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const selectPhoto = async (req, res) => {
  const { photoId, photoName, thumbnailLink, fullImageLink } = req.body;

  try {
    const existing = await PhotoSelection.findOne({
      user: req.user.id,
      photoId
    });

    if (existing) {
      // Remove selection (toggle off)
      await PhotoSelection.deleteOne({ _id: existing._id });
      return res.json({ 
        message: 'Photo deselected',
        deselected: true,
        photoId
      });
    }

    // Add new selection
    const selection = await PhotoSelection.create({
      user: req.user.id,
      photoId,
      photoName,
      thumbnailLink,
      fullImageLink
    });

    res.status(201).json({ 
      message: 'Photo selected',
      selection 
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getMySelections = async (req, res) => {
  const selections = await PhotoSelection.find({ user: req.user.id })
    .sort({ selectedAt: -1 });
  res.json(selections);
};

const getUserSelections = async (req, res) => {
  const { userId } = req.params;
  const selections = await PhotoSelection.find({ user: userId })
    .sort({ selectedAt: -1 });
  res.json(selections);
};

module.exports = { getUserGallery, selectPhoto, getMySelections, getUserSelections };