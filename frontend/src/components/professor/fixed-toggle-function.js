  const handleToggleQuizLiveActive = async (quizId, currentStatus) => {
    try {
      // Calculate new status - handle both boolean and numeric values
      const isCurrentlyActive = Boolean(currentStatus);
      const newStatus = !isCurrentlyActive;
      
      console.log('🔄 Live toggling quiz', quizId);
      console.log('📊 Current status:', currentStatus, 'active:', isCurrentlyActive);
      console.log('📊 New status will be:', newStatus);
      
      // Get quiz details for socket broadcast
      const quiz = quizzes.find(q => q.id === quizId);
      if (!quiz) {
        setError('Quiz not found');
        return;
      }

      // Step 1: Live toggle via socket (no DB update yet)
      const response = await api.patch(`/quizzes/${quizId}/live-toggle`, {
        isLiveActive: newStatus
      });
      
      console.log('📡 Live toggle response:', response.data);
      
      // Update the quiz in local state immediately for better UX
      setQuizzes(prev => prev.map(q => 
        q.id === quizId 
          ? { ...q, is_live_active: newStatus }
          : q
      ));

      // Step 2: Broadcast live via socket to students
      const eventType = newStatus ? 'live_quiz_activate' : 'live_quiz_deactivate';
      socket.emit(eventType, {
        quizId: quizId,
        quizTitle: quiz.title,
        classId: quiz.class_id,
        professorName: user.full_name || user.email,
        timestamp: Date.now()
      });

      console.log('📡 Live', newStatus ? 'activation' : 'deactivation', 'broadcasted via socket');

      // Step 3: Confirm in database after a short delay
      setTimeout(async () => {
        try {
          await api.patch(`/quizzes/${quizId}/confirm-toggle`, {
            isLiveActive: newStatus
          });
          console.log('💾 Quiz', quizId, 'status confirmed in database');
        } catch (err) {
          console.error('⚠️ Failed to confirm quiz status in database:', err);
        }
      }, 1000);

      console.log('✅ Quiz', quizId, newStatus ? 'activated' : 'deactivated', 'live successfully');
      
      // Force refresh quiz list to ensure UI is in sync with database
      console.log('🔄 Refreshing quiz list to sync with database...');
      await fetchQuizzes();
      
    } catch (err) {
      console.error('❌ Failed to toggle quiz status:', err);
      setError(err.response?.data?.message || 'Failed to update quiz status');
    }
  };
