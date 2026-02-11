/**
 * App con rutas (Tarea 1.1).
 * Rutas: /, /topics, /topic/:topicId, /test, /result, /settings.
 */

import { Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import Layout from "./components/Layout";
import {
  HomeScreen,
  TopicsScreen,
  TopicScreen,
  SectionReviewScreen,
  TestScreen,
  ResultScreen,
  SettingsScreen,
  StatsScreen,
  FailedReviewScreen,
} from "./screens";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomeScreen />} />
          <Route path="topics" element={<TopicsScreen />} />
          <Route path="topic/:topicId" element={<TopicScreen />} />
          <Route path="review/failed" element={<FailedReviewScreen />} />
          <Route path="review/section/:sectionEncoded" element={<SectionReviewScreen />} />
          <Route path="test" element={<TestScreen />} />
          <Route path="result" element={<ResultScreen />} />
          <Route path="stats" element={<StatsScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>
      </Routes>
      <Analytics />
    </>
  );
}
