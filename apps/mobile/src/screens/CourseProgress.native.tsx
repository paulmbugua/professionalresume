import React from 'react';
import { View, Text, Picker, ActivityIndicator } from 'react-native';
import { useCourseProgress } from '@mytutorapp/shared/hooks/useCourseProgress';

interface Props {
  backendUrl: string;
  courseId: string;
  token: string;
  syllabus: { week: number; topic: string }[];
}

const CourseProgress: React.FC<Props> = ({ backendUrl, courseId, token, syllabus }) => {
  const { progress, update, loading } = useCourseProgress(backendUrl, courseId, token);

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <View>
      {syllabus.map((item) => {
        const status = progress.find((p) => p.week === item.week)?.status || 'Not Started';
        return (
          <View key={item.week} style={{ padding: 12, marginBottom: 8, borderWidth: 1, borderRadius: 8 }}>
            <Text style={{ fontWeight: '600' }}>Week {item.week}: {item.topic}</Text>
            <Text>Status: {status}</Text>
            <Picker
              selectedValue={status}
              onValueChange={(value) => update({ courseId, week: item.week, status: value as any })}
            >
              <Picker.Item label="Not Started" value="Not Started" />
              <Picker.Item label="In Progress" value="In Progress" />
              <Picker.Item label="Completed" value="Completed" />
            </Picker>
          </View>
        );
      })}
    </View>
  );
};

export default CourseProgress;
