import React from 'react';
import { View, Text, ScrollView, Button, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useEnrollCourse } from '@mytutorapp/shared/hooks/useEnrollCourse';
import type { Course } from '@mytutorapp/shared/types/course';
import tw from '../../tailwind';

interface Props {
  course: Course;
}

const CourseEnrollment: React.FC<Props> = ({ course }) => {
  const route = useRoute<any>();
  const { id } = route.params;
  const { loading, error, enrolled, handleEnroll } = useEnrollCourse(id);

  return (
    <ScrollView style={tw`p-4 bg-white`}>
      <Text style={tw`text-2xl font-bold mb-2`}>{course.title}</Text>
      <Text style={tw`text-gray-700 mb-4`}>{course.description}</Text>
      <Text style={tw`mb-1 text-gray-500`}>Level: {course.level}</Text>
      <Text style={tw`mb-1 text-gray-500`}>Duration: {course.duration}</Text>
      <Text style={tw`mb-4 font-semibold`}>Price: ${course.price}</Text>

      {enrolled ? (
        <Text style={tw`text-green-600 font-semibold mb-4`}>
          ✅ You are enrolled in this course!
        </Text>
      ) : loading ? (
        <ActivityIndicator size="small" color="#2563eb" />
      ) : (
        <Button title="Enroll Now" onPress={handleEnroll} />
      )}

      {error && <Text style={tw`text-red-500 mt-4`}>{error}</Text>}

      {course.syllabus && (
        <View style={tw`mt-6`}>
          <Text style={tw`text-lg font-semibold mb-2`}>Syllabus</Text>
          {course.syllabus.map((s, i) => (
            <Text key={i} style={tw`mb-1`}>
              📘 Week {s.week}: {s.topic}
              {s.assignment ? ` - ${s.assignment}` : ''}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default CourseEnrollment;
