// Imports and utilities
import { v2 as cloudinary } from 'cloudinary';
import { Profile } from '../models/Profile.js';
import {
  profileValidationSchema,
  profileUpdateValidationSchema,
} from '../validators/profileValidators.js';

// Utility function to upload files to Cloudinary
const uploadToCloudinary = async (files, resourceType = 'image') => {
  try {
    const uploadPromises = files.map(async (file) => {
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: resourceType,
        public_id: `profiles/${file.filename}`,
      });
      return { url: result.secure_url, public_id: result.public_id };
    });
    return Promise.all(uploadPromises);
  } catch (error) {
    throw new Error('File upload failed');
  }
};

// Utility function to delete files from Cloudinary
const deleteFromCloudinary = async (publicIds) => {
  try {
    await cloudinary.api.delete_resources(publicIds);
  } catch (error) {
    console.error('Cloudinary Delete Error:', error.message);
  }
};

// 1. Create Profile
export const createProfile = async (req, res) => {
  try {
    const {
      role,
      name,
      age: ageStr,
      category,
      languages,
      ageGroup,
      pricing,
    } = req.body;

    // Parse and validate age
    const age = parseInt(ageStr, 10);
    if (!['tutor', 'student'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "tutor" or "student".',
      });
    }
    if ((role === 'tutor' && age < 18) || (role === 'student' && age < 5)) {
      return res.status(400).json({
        success: false,
        message:
          role === 'tutor'
            ? 'Tutors must be at least 18 years old.'
            : 'Students must be at least 5 years old.',
      });
    }

    // Parse description for tutors
    const description = {
      bio: req.body['description.bio'] || '',
      expertise:
        role === 'tutor'
          ? JSON.parse(req.body['description.expertise'] || '[]')
          : [],
      teachingStyle:
        role === 'tutor'
          ? JSON.parse(req.body['description.teachingStyle'] || '[]')
          : [],
    };

    // Validate data using Joi
    const { error } = profileValidationSchema.validate({
      role,
      name,
      age,
      category,
      description,
      pricing: role === 'tutor' ? JSON.parse(pricing || '{}') : undefined,
      languages: JSON.parse(languages || '[]'),
      ageGroup: role === 'student' ? JSON.parse(ageGroup || '[]') : undefined,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details,
      });
    }

    // Handle file uploads
    const images = ['image1', 'image2', 'image3', 'image4']
      .map((key) => req.files?.[key]?.[0])
      .filter(Boolean);
    const gallery = await uploadToCloudinary(images, 'image');
    const videoUrl =
      role === 'tutor' && req.files?.video?.[0]
        ? (await uploadToCloudinary([req.files.video[0]], 'video'))[0]?.url
        : null;

    // Construct profile data
    const profileData = {
      user: req.user.id,
      role,
      name,
      age,
      category,
      languages: JSON.parse(languages || '[]'),
      gallery: gallery.map(({ url }) => url),
      video: role === 'tutor' ? videoUrl : undefined,
      description,
      pricing: role === 'tutor' ? JSON.parse(pricing || '{}') : undefined,
      ageGroup: role === 'student' ? JSON.parse(ageGroup || '[]') : undefined,
    };

    // Save profile
    const profile = new Profile(profileData);
    await profile.save();

    res.status(201).json({ success: true, profile });
  } catch (error) {
    console.error('Error in createProfile:', error.message);
    res
      .status(500)
      .json({ message: 'Failed to create profile.', error: error.message });
  }
};

// 2. Update Profile
export const updateProfile = async (req, res) => {
  try {
    const {
      role,
      name,
      age: ageStr,
      category,
      pricing,
      languages,
      recommended,
      ageGroup,
    } = req.body;
    const profile = await Profile.findOne({ user: req.user.id });

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: 'Profile not found.' });
    }

    // Parse and validate fields
    const age = parseInt(ageStr, 10);
    const description = {
      bio: req.body['description.bio'] || profile.description.bio,
      expertise:
        role === 'tutor'
          ? JSON.parse(req.body['description.expertise'] || '[]')
          : profile.description.expertise,
      teachingStyle:
        role === 'tutor'
          ? JSON.parse(req.body['description.teachingStyle'] || '[]')
          : profile.description.teachingStyle,
    };

    // Validate data using Joi
    const { error } = profileUpdateValidationSchema.validate({
      role: profile.role,
      name,
      age,
      category,
      pricing: role === 'tutor' ? JSON.parse(pricing || '{}') : undefined,
      languages: JSON.parse(languages || '[]'),
      recommended: JSON.parse(recommended || '[]'),
      ageGroup: role === 'student' ? JSON.parse(ageGroup || '[]') : undefined,
      description,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details,
      });
    }

    // Update profile fields
    profile.name = name || profile.name;
    profile.age = age || profile.age;
    profile.category = category || profile.category;
    profile.languages = JSON.parse(languages || '[]') || profile.languages;
    profile.recommended =
      JSON.parse(recommended || '[]') || profile.recommended;

    if (profile.role === 'tutor') {
      profile.description = description;
      profile.pricing = JSON.parse(pricing || '{}') || profile.pricing;
    }

    if (profile.role === 'student') {
      profile.ageGroup = JSON.parse(ageGroup || '[]') || profile.ageGroup;
    }

    // Handle file uploads
    const images = ['image1', 'image2', 'image3', 'image4']
      .map((key) => req.files?.[key]?.[0])
      .filter(Boolean);

    if (images.length) {
      const uploadedImages = await uploadToCloudinary(images, 'image');
      profile.gallery = uploadedImages.map(({ url }) => url);
    }

    if (profile.role === 'tutor' && req.files?.video?.[0]) {
      const videoUpload = await uploadToCloudinary(
        [req.files.video[0]],
        'video',
      );
      profile.video = videoUpload[0]?.url || profile.video;
    }

    const updatedProfile = await profile.save();
    res.status(200).json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error('Error in updateProfile:', error.message);
    res
      .status(500)
      .json({ message: 'Failed to update profile.', error: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    // Assume req.user.role is provided by your authentication middleware
    const userRole = req.user.role;

    let profile;
    if (userRole === 'student') {
      // For students, only select the allowed fields
      profile = await Profile.findOne({ user: req.user.id }).select(
        'name age ageGroup languages role',
      );
    } else {
      // For tutors (or other roles), return the full document (or a different subset)
      profile = await Profile.findOne({ user: req.user.id });
    }

    if (!profile) {
      return res
        .status(200)
        .json({ profileExists: false, profile: { gallery: [] } });
    }

    // Ensure gallery is always an array
    const safeProfile = {
      ...profile.toObject(),
      gallery: Array.isArray(profile.gallery) ? profile.gallery : [],
    };

    res.status(200).json({ profileExists: true, profile: safeProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile.' });
  }
};

// 4. Toggle Notifications
export const toggleNotifications = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    if (!profile)
      return res.status(404).json({ message: 'Profile not found.' });

    profile.notifications = !profile.notifications;
    await profile.save();
    res.json({
      success: true,
      message: 'Notifications toggled successfully',
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle notifications.' });
  }
};

// 5. Add Recent Chat Interaction
export const addRecentChat = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    profile.recentChatsCount += 1;
    await profile.save();
    res
      .status(200)
      .json({ success: true, message: 'Added to recent chats', profile });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to update recent chats' });
  }
};

// 6. Update Profile Rating
export const updateRating = async (req, res) => {
  try {
    const { rating } = req.body;
    const profile = await Profile.findById(req.params.id);
    profile.rating.total += rating;
    profile.rating.count += 1;
    await profile.save();
    res.status(200).json({ success: true, message: 'Rating updated', profile });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to update rating' });
  }
};

// 7. Get Profile (with filters)
export const getProfile = async (req, res) => {
  const {
    experienceLevel,
    expertise,
    teachingStyle,
    ageGroup,
    languageFluency,
    pricing,
    category,
    attribute,
  } = req.query;

  let filter = {};
  if (experienceLevel) filter.experienceLevel = experienceLevel;

  // Filter by teaching style (supports multiple values with comma-separated strings)
  if (teachingStyle)
    filter['description.teachingStyle'] = { $in: teachingStyle.split(',') };

  // Filter by expertise
  if (expertise)
    filter['description.expertise'] = { $in: expertise.split(',') };

  // Filter by age group (matches if any value in the array matches)
  if (ageGroup) filter.ageGroup = { $in: ageGroup.split(',') };

  // Filter by language fluency
  if (languageFluency) filter.languageFluency = languageFluency;

  // Filter by pricing range (handles nested fields for different session types)
  if (pricing) {
    const [min, max] = pricing.split('-').map(Number);
    filter.$or = [
      { 'pricing.privateSession': { $gte: min, $lte: max } },
      { 'pricing.groupSession': { $gte: min, $lte: max } },
      { 'pricing.lecture': { $gte: min, $lte: max } },
      { 'pricing.workshop': { $gte: min, $lte: max } },
    ];
  }

  // Filter by category
  if (category) filter.category = category;

  // Filter by additional attributes if provided
  if (attribute) filter.attributes = attribute;

  try {
    const profiles =
      Object.keys(filter).length > 0
        ? await Profile.find(filter)
        : await Profile.find()
            .sort({
              favoritesCount: -1,
              recentChatsCount: -1,
              'rating.total': -1,
            })
            .limit(20);

    res.status(200).json({ success: true, profiles });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch profiles' });
  }
};
// 8. Get Profile by ID
export const getProfileById = async (req, res) => {
  const { id } = req.params;

  try {
    const profile = await Profile.findById(id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

// 9. Remove Profile Item
export const removeProfileItem = async (req, res) => {
  const { id, field } = req.params;
  const { item } = req.body;

  try {
    const profile = await Profile.findById(id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    if (field === 'gallery') {
      const publicIdToRemove = item.split('/').pop().split('.')[0];
      await deleteFromCloudinary([publicIdToRemove]);
      profile.gallery = profile.gallery.filter((url) => url !== item);
    } else if (field === 'video') {
      const publicIdToRemove = profile.video.split('/').pop().split('.')[0];
      await deleteFromCloudinary([publicIdToRemove]);
      profile.video = '';
    } else {
      await Profile.findByIdAndUpdate(id, { $pull: { [field]: item } });
    }

    await profile.save();
    res
      .status(200)
      .json({ message: `${field} item removed successfully`, profile });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// 10. Upload Single File
export const uploadSingleFile = async (req, res) => {
  const { type } = req.params;
  if (!['image', 'video'].includes(type))
    return res.status(400).json({ message: 'Invalid file type' });

  try {
    const resourceType = type === 'video' ? 'video' : 'image';
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: resourceType,
      folder: 'profiles',
    });
    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    res.status(500).json({ message: 'File upload failed' });
  }
};

// 11. Get Profile with Recommendations
export const getProfileWithRecommendations = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await Profile.findById(id).populate(
      'recommended',
      'name status gallery',
    );
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

// 12. Get Profile by User ID
export const getProfileByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const profile = await Profile.findOne({ user: userId });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile by user ID.' });
  }
};

// 13. Get Random Profile
export const getRandomProfile = async (req, res) => {
  try {
    const count = await Profile.countDocuments();
    const random = Math.floor(Math.random() * count);
    const randomProfile = await Profile.findOne()
      .skip(random)
      .select(
        'name gallery category description.expertise description.teachingStyle rating',
      );

    if (!randomProfile) {
      return res.status(404).json({ message: 'No profiles found' });
    }

    res.json({
      name: randomProfile.name,
      role: randomProfile.role,
      gallery: randomProfile.gallery,
      category: randomProfile.category,
      expertise: randomProfile.description?.expertise || [],
      teachingStyle: randomProfile.description?.teachingStyle || [],
      rating: randomProfile.rating,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
};
