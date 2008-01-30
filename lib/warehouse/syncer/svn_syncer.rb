module Warehouse
  module Syncer
    class SvnSyncer < Base
      @@extra_change_names      = Set.new(%w(MV CP))
      @@undiffable_change_names = Set.new(%w(D))

      def process
        super do |authors|
          latest_changeset = @connection[:changesets].where(:repository_id => @repo[:id]).order(:changed_at.DESC).first
          recorded_rev     = latest_changeset ? latest_changeset[:revision].to_i : 0
          latest_rev       = @silo.latest_revision
          @connection.transaction do    
            i = 0
            rev = recorded_rev
            until rev >= latest_rev || (@num > 0 && i >= @num) do
              rev += 1
              changeset = create_changeset(rev)
              if i > 1 && i % 100 == 0
                update_repository_progress rev, changeset, 100
                @connection.execute "COMMIT"
                @connection.execute "BEGIN"
                i = -1
                puts "##{rev}", :debug
              end
              authors[changeset[:author]] = changeset[:changed_at]
              i += 1
            end
            update_repository_progress rev, changeset, i
          end
        end
      end

    protected
      def update_repository_progress(revision, changeset, num)
        return if num < 1
        @repo[:changesets_count] = @repo[:changesets_count].to_i + num
        @connection[:repositories].where(:id => @repo[:id]).update :changesets_count => @repo[:changesets_count],
          :synced_changed_at => changeset[:changed_at], :synced_revision => revision
      end

      def create_changeset(revision)
        node      = @silo.node_at('', revision)
        changeset = { 
          :repository_id => @repo[:id],
          :revision      => revision,
          :author        => node.author,
          :message       => node.message,
          :changed_at    => node.changed_at}
        changeset_id   = @connection[:changesets] << changeset
        changes = {:all => [], :diffable => []}
        create_change_from_changeset(node, changeset.update(:id => changeset_id), changes)
        @connection[:changesets].filter(:id => changeset_id).update(:diffable => 1) if changes[:diffable].size > 0
        changeset
      end
    
      def create_change_from_changeset(node, changeset, changes)
        (node.added_files).each do |path|
          process_change_path_and_save(node, changeset, 'A', path, changes)
        end
      
        (node.updated_files).each do |path|
          process_change_path_and_save(node, changeset, 'M', path, changes)
        end
      
        deleted_files = node.deleted_files
        moved_files, copied_files  = (node.copied_files).partition do |path|
          deleted_files.delete(path[1])
        end
      
        moved_files.each do |path|
          process_change_path_and_save(node, changeset, 'MV', path, changes)
        end
      
        copied_files.each do |path|
          process_change_path_and_save(node, changeset, 'CP', path, changes)
        end
      
        deleted_files.each do |path|
          process_change_path_and_save(node, changeset, 'D', path, changes)
        end
      end

      def process_change_path_and_save(node, changeset, name, path, changes)
        change = {:changeset_id => changeset[:id], :name => name, :path => path}
        if @@extra_change_names.include?(name)
          change[:path]          = path[0]
          change[:from_path]     = path[1]
          change[:from_revision] = path[2]
        end
        unless @@undiffable_change_names.include?(change[:name]) || changeset[:diffable] == 1
          changes[:diffable] << change unless node.mime_type == 'application/octet-stream'
        end
        changes[:all] << change
        @connection[:changes] << change
      end
    end
  end
end