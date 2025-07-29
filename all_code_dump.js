

// -------------------------
// File: .git\config
// -------------------------

[core]
	repositoryformatversion = 0
	filemode = false
	bare = false
	logallrefupdates = true
	symlinks = false
	ignorecase = true
[remote "origin"]
	url = git@github.com:reallywasi/BookMyGrad.git
	fetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
	remote = origin
	merge = refs/heads/main
	vscode-merge-base = origin/main


// -------------------------
// File: .git\description
// -------------------------

Unnamed repository; edit this file 'description' to name the repository.


// -------------------------
// File: .git\HEAD
// -------------------------

ref: refs/heads/main


// -------------------------
// File: .git\hooks\applypatch-msg.sample
// -------------------------

#!/bin/sh
#
# An example hook script to check the commit log message taken by
# applypatch from an e-mail message.
#
# The hook should exit with non-zero status after issuing an
# appropriate message if it wants to stop the commit.  The hook is
# allowed to edit the commit message file.
#
# To enable this hook, rename this file to "applypatch-msg".

. git-sh-setup
commitmsg="$(git rev-parse --git-path hooks/commit-msg)"
test -x "$commitmsg" && exec "$commitmsg" ${1+"$@"}
:


// -------------------------
// File: .git\hooks\commit-msg.sample
// -------------------------

#!/bin/sh
#
# An example hook script to check the commit log message.
# Called by "git commit" with one argument, the name of the file
# that has the commit message.  The hook should exit with non-zero
# status after issuing an appropriate message if it wants to stop the
# commit.  The hook is allowed to edit the commit message file.
#
# To enable this hook, rename this file to "commit-msg".

# Uncomment the below to add a Signed-off-by line to the message.
# Doing this in a hook is a bad idea in general, but the prepare-commit-msg
# hook is more suited to it.
#
# SOB=$(git var GIT_AUTHOR_IDENT | sed -n 's/^\(.*>\).*$/Signed-off-by: \1/p')
# grep -qs "^$SOB" "$1" || echo "$SOB" >> "$1"

# This example catches duplicate Signed-off-by lines.

test "" = "$(grep '^Signed-off-by: ' "$1" |
	 sort | uniq -c | sed -e '/^[ 	]*1[ 	]/d')" || {
	echo >&2 Duplicate Signed-off-by lines.
	exit 1
}


// -------------------------
// File: .git\hooks\fsmonitor-watchman.sample
// -------------------------

#!/usr/bin/perl

use strict;
use warnings;
use IPC::Open2;

# An example hook script to integrate Watchman
# (https://facebook.github.io/watchman/) with git to speed up detecting
# new and modified files.
#
# The hook is passed a version (currently 2) and last update token
# formatted as a string and outputs to stdout a new update token and
# all files that have been modified since the update token. Paths must
# be relative to the root of the working tree and separated by a single NUL.
#
# To enable this hook, rename this file to "query-watchman" and set
# 'git config core.fsmonitor .git/hooks/query-watchman'
#
my ($version, $last_update_token) = @ARGV;

# Uncomment for debugging
# print STDERR "$0 $version $last_update_token\n";

# Check the hook interface version
if ($version ne 2) {
	die "Unsupported query-fsmonitor hook version '$version'.\n" .
	    "Falling back to scanning...\n";
}

my $git_work_tree = get_working_dir();

my $retry = 1;

my $json_pkg;
eval {
	require JSON::XS;
	$json_pkg = "JSON::XS";
	1;
} or do {
	require JSON::PP;
	$json_pkg = "JSON::PP";
};

launch_watchman();

sub launch_watchman {
	my $o = watchman_query();
	if (is_work_tree_watched($o)) {
		output_result($o->{clock}, @{$o->{files}});
	}
}

sub output_result {
	my ($clockid, @files) = @_;

	# Uncomment for debugging watchman output
	# open (my $fh, ">", ".git/watchman-output.out");
	# binmode $fh, ":utf8";
	# print $fh "$clockid\n@files\n";
	# close $fh;

	binmode STDOUT, ":utf8";
	print $clockid;
	print "\0";
	local $, = "\0";
	print @files;
}

sub watchman_clock {
	my $response = qx/watchman clock "$git_work_tree"/;
	die "Failed to get clock id on '$git_work_tree'.\n" .
		"Falling back to scanning...\n" if $? != 0;

	return $json_pkg->new->utf8->decode($response);
}

sub watchman_query {
	my $pid = open2(\*CHLD_OUT, \*CHLD_IN, 'watchman -j --no-pretty')
	or die "open2() failed: $!\n" .
	"Falling back to scanning...\n";

	# In the query expression below we're asking for names of files that
	# changed since $last_update_token but not from the .git folder.
	#
	# To accomplish this, we're using the "since" generator to use the
	# recency index to select candidate nodes and "fields" to limit the
	# output to file names only. Then we're using the "expression" term to
	# further constrain the results.
	my $last_update_line = "";
	if (substr($last_update_token, 0, 1) eq "c") {
		$last_update_token = "\"$last_update_token\"";
		$last_update_line = qq[\n"since": $last_update_token,];
	}
	my $query = <<"	END";
		["query", "$git_work_tree", {$last_update_line
			"fields": ["name"],
			"expression": ["not", ["dirname", ".git"]]
		}]
	END

	# Uncomment for debugging the watchman query
	# open (my $fh, ">", ".git/watchman-query.json");
	# print $fh $query;
	# close $fh;

	print CHLD_IN $query;
	close CHLD_IN;
	my $response = do {local $/; <CHLD_OUT>};

	# Uncomment for debugging the watch response
	# open ($fh, ">", ".git/watchman-response.json");
	# print $fh $response;
	# close $fh;

	die "Watchman: command returned no output.\n" .
	"Falling back to scanning...\n" if $response eq "";
	die "Watchman: command returned invalid output: $response\n" .
	"Falling back to scanning...\n" unless $response =~ /^\{/;

	return $json_pkg->new->utf8->decode($response);
}

sub is_work_tree_watched {
	my ($output) = @_;
	my $error = $output->{error};
	if ($retry > 0 and $error and $error =~ m/unable to resolve root .* directory (.*) is not watched/) {
		$retry--;
		my $response = qx/watchman watch "$git_work_tree"/;
		die "Failed to make watchman watch '$git_work_tree'.\n" .
		    "Falling back to scanning...\n" if $? != 0;
		$output = $json_pkg->new->utf8->decode($response);
		$error = $output->{error};
		die "Watchman: $error.\n" .
		"Falling back to scanning...\n" if $error;

		# Uncomment for debugging watchman output
		# open (my $fh, ">", ".git/watchman-output.out");
		# close $fh;

		# Watchman will always return all files on the first query so
		# return the fast "everything is dirty" flag to git and do the
		# Watchman query just to get it over with now so we won't pay
		# the cost in git to look up each individual file.
		my $o = watchman_clock();
		$error = $output->{error};

		die "Watchman: $error.\n" .
		"Falling back to scanning...\n" if $error;

		output_result($o->{clock}, ("/"));
		$last_update_token = $o->{clock};

		eval { launch_watchman() };
		return 0;
	}

	die "Watchman: $error.\n" .
	"Falling back to scanning...\n" if $error;

	return 1;
}

sub get_working_dir {
	my $working_dir;
	if ($^O =~ 'msys' || $^O =~ 'cygwin') {
		$working_dir = Win32::GetCwd();
		$working_dir =~ tr/\\/\//;
	} else {
		require Cwd;
		$working_dir = Cwd::cwd();
	}

	return $working_dir;
}


// -------------------------
// File: .git\hooks\post-update.sample
// -------------------------

#!/bin/sh
#
# An example hook script to prepare a packed repository for use over
# dumb transports.
#
# To enable this hook, rename this file to "post-update".

exec git update-server-info


// -------------------------
// File: .git\hooks\pre-applypatch.sample
// -------------------------

#!/bin/sh
#
# An example hook script to verify what is about to be committed
# by applypatch from an e-mail message.
#
# The hook should exit with non-zero status after issuing an
# appropriate message if it wants to stop the commit.
#
# To enable this hook, rename this file to "pre-applypatch".

. git-sh-setup
precommit="$(git rev-parse --git-path hooks/pre-commit)"
test -x "$precommit" && exec "$precommit" ${1+"$@"}
:


// -------------------------
// File: .git\hooks\pre-commit.sample
// -------------------------

#!/bin/sh
#
# An example hook script to verify what is about to be committed.
# Called by "git commit" with no arguments.  The hook should
# exit with non-zero status after issuing an appropriate message if
# it wants to stop the commit.
#
# To enable this hook, rename this file to "pre-commit".

if git rev-parse --verify HEAD >/dev/null 2>&1
then
	against=HEAD
else
	# Initial commit: diff against an empty tree object
	against=$(git hash-object -t tree /dev/null)
fi

# If you want to allow non-ASCII filenames set this variable to true.
allownonascii=$(git config --type=bool hooks.allownonascii)

# Redirect output to stderr.
exec 1>&2

# Cross platform projects tend to avoid non-ASCII filenames; prevent
# them from being added to the repository. We exploit the fact that the
# printable range starts at the space character and ends with tilde.
if [ "$allownonascii" != "true" ] &&
	# Note that the use of brackets around a tr range is ok here, (it's
	# even required, for portability to Solaris 10's /usr/bin/tr), since
	# the square bracket bytes happen to fall in the designated range.
	test $(git diff-index --cached --name-only --diff-filter=A -z $against |
	  LC_ALL=C tr -d '[ -~]\0' | wc -c) != 0
then
	cat <<\EOF
Error: Attempt to add a non-ASCII file name.

This can cause problems if you want to work with people on other platforms.

To be portable it is advisable to rename the file.

If you know what you are doing you can disable this check using:

  git config hooks.allownonascii true
EOF
	exit 1
fi

# If there are whitespace errors, print the offending file names and fail.
exec git diff-index --check --cached $against --


// -------------------------
// File: .git\hooks\pre-merge-commit.sample
// -------------------------

#!/bin/sh
#
# An example hook script to verify what is about to be committed.
# Called by "git merge" with no arguments.  The hook should
# exit with non-zero status after issuing an appropriate message to
# stderr if it wants to stop the merge commit.
#
# To enable this hook, rename this file to "pre-merge-commit".

. git-sh-setup
test -x "$GIT_DIR/hooks/pre-commit" &&
        exec "$GIT_DIR/hooks/pre-commit"
:


// -------------------------
// File: .git\hooks\pre-push.sample
// -------------------------

#!/bin/sh

# An example hook script to verify what is about to be pushed.  Called by "git
# push" after it has checked the remote status, but before anything has been
# pushed.  If this script exits with a non-zero status nothing will be pushed.
#
# This hook is called with the following parameters:
#
# $1 -- Name of the remote to which the push is being done
# $2 -- URL to which the push is being done
#
# If pushing without using a named remote those arguments will be equal.
#
# Information about the commits which are being pushed is supplied as lines to
# the standard input in the form:
#
#   <local ref> <local oid> <remote ref> <remote oid>
#
# This sample shows how to prevent push of commits where the log message starts
# with "WIP" (work in progress).

remote="$1"
url="$2"

zero=$(git hash-object --stdin </dev/null | tr '[0-9a-f]' '0')

while read local_ref local_oid remote_ref remote_oid
do
	if test "$local_oid" = "$zero"
	then
		# Handle delete
		:
	else
		if test "$remote_oid" = "$zero"
		then
			# New branch, examine all commits
			range="$local_oid"
		else
			# Update to existing branch, examine new commits
			range="$remote_oid..$local_oid"
		fi

		# Check for WIP commit
		commit=$(git rev-list -n 1 --grep '^WIP' "$range")
		if test -n "$commit"
		then
			echo >&2 "Found WIP commit in $local_ref, not pushing"
			exit 1
		fi
	fi
done

exit 0


// -------------------------
// File: .git\hooks\pre-rebase.sample
// -------------------------

#!/bin/sh
#
# Copyright (c) 2006, 2008 Junio C Hamano
#
# The "pre-rebase" hook is run just before "git rebase" starts doing
# its job, and can prevent the command from running by exiting with
# non-zero status.
#
# The hook is called with the following parameters:
#
# $1 -- the upstream the series was forked from.
# $2 -- the branch being rebased (or empty when rebasing the current branch).
#
# This sample shows how to prevent topic branches that are already
# merged to 'next' branch from getting rebased, because allowing it
# would result in rebasing already published history.

publish=next
basebranch="$1"
if test "$#" = 2
then
	topic="refs/heads/$2"
else
	topic=`git symbolic-ref HEAD` ||
	exit 0 ;# we do not interrupt rebasing detached HEAD
fi

case "$topic" in
refs/heads/??/*)
	;;
*)
	exit 0 ;# we do not interrupt others.
	;;
esac

# Now we are dealing with a topic branch being rebased
# on top of master.  Is it OK to rebase it?

# Does the topic really exist?
git show-ref -q "$topic" || {
	echo >&2 "No such branch $topic"
	exit 1
}

# Is topic fully merged to master?
not_in_master=`git rev-list --pretty=oneline ^master "$topic"`
if test -z "$not_in_master"
then
	echo >&2 "$topic is fully merged to master; better remove it."
	exit 1 ;# we could allow it, but there is no point.
fi

# Is topic ever merged to next?  If so you should not be rebasing it.
only_next_1=`git rev-list ^master "^$topic" ${publish} | sort`
only_next_2=`git rev-list ^master           ${publish} | sort`
if test "$only_next_1" = "$only_next_2"
then
	not_in_topic=`git rev-list "^$topic" master`
	if test -z "$not_in_topic"
	then
		echo >&2 "$topic is already up to date with master"
		exit 1 ;# we could allow it, but there is no point.
	else
		exit 0
	fi
else
	not_in_next=`git rev-list --pretty=oneline ^${publish} "$topic"`
	/usr/bin/perl -e '
		my $topic = $ARGV[0];
		my $msg = "* $topic has commits already merged to public branch:\n";
		my (%not_in_next) = map {
			/^([0-9a-f]+) /;
			($1 => 1);
		} split(/\n/, $ARGV[1]);
		for my $elem (map {
				/^([0-9a-f]+) (.*)$/;
				[$1 => $2];
			} split(/\n/, $ARGV[2])) {
			if (!exists $not_in_next{$elem->[0]}) {
				if ($msg) {
					print STDERR $msg;
					undef $msg;
				}
				print STDERR " $elem->[1]\n";
			}
		}
	' "$topic" "$not_in_next" "$not_in_master"
	exit 1
fi

<<\DOC_END

This sample hook safeguards topic branches that have been
published from being rewound.

The workflow assumed here is:

 * Once a topic branch forks from "master", "master" is never
   merged into it again (either directly or indirectly).

 * Once a topic branch is fully cooked and merged into "master",
   it is deleted.  If you need to build on top of it to correct
   earlier mistakes, a new topic branch is created by forking at
   the tip of the "master".  This is not strictly necessary, but
   it makes it easier to keep your history simple.

 * Whenever you need to test or publish your changes to topic
   branches, merge them into "next" branch.

The script, being an example, hardcodes the publish branch name
to be "next", but it is trivial to make it configurable via
$GIT_DIR/config mechanism.

With this workflow, you would want to know:

(1) ... if a topic branch has ever been merged to "next".  Young
    topic branches can have stupid mistakes you would rather
    clean up before publishing, and things that have not been
    merged into other branches can be easily rebased without
    affecting other people.  But once it is published, you would
    not want to rewind it.

(2) ... if a topic branch has been fully merged to "master".
    Then you can delete it.  More importantly, you should not
    build on top of it -- other people may already want to
    change things related to the topic as patches against your
    "master", so if you need further changes, it is better to
    fork the topic (perhaps with the same name) afresh from the
    tip of "master".

Let's look at this example:

		   o---o---o---o---o---o---o---o---o---o "next"
		  /       /           /           /
		 /   a---a---b A     /           /
		/   /               /           /
	       /   /   c---c---c---c B         /
	      /   /   /             \         /
	     /   /   /   b---b C     \       /
	    /   /   /   /             \     /
    ---o---o---o---o---o---o---o---o---o---o---o "master"


A, B and C are topic branches.

 * A has one fix since it was merged up to "next".

 * B has finished.  It has been fully merged up to "master" and "next",
   and is ready to be deleted.

 * C has not merged to "next" at all.

We would want to allow C to be rebased, refuse A, and encourage
B to be deleted.

To compute (1):

	git rev-list ^master ^topic next
	git rev-list ^master        next

	if these match, topic has not merged in next at all.

To compute (2):

	git rev-list master..topic

	if this is empty, it is fully merged to "master".

DOC_END


// -------------------------
// File: .git\hooks\pre-receive.sample
// -------------------------

#!/bin/sh
#
# An example hook script to make use of push options.
# The example simply echoes all push options that start with 'echoback='
# and rejects all pushes when the "reject" push option is used.
#
# To enable this hook, rename this file to "pre-receive".

if test -n "$GIT_PUSH_OPTION_COUNT"
then
	i=0
	while test "$i" -lt "$GIT_PUSH_OPTION_COUNT"
	do
		eval "value=\$GIT_PUSH_OPTION_$i"
		case "$value" in
		echoback=*)
			echo "echo from the pre-receive-hook: ${value#*=}" >&2
			;;
		reject)
			exit 1
		esac
		i=$((i + 1))
	done
fi


// -------------------------
// File: .git\hooks\prepare-commit-msg.sample
// -------------------------

#!/bin/sh
#
# An example hook script to prepare the commit log message.
# Called by "git commit" with the name of the file that has the
# commit message, followed by the description of the commit
# message's source.  The hook's purpose is to edit the commit
# message file.  If the hook fails with a non-zero status,
# the commit is aborted.
#
# To enable this hook, rename this file to "prepare-commit-msg".

# This hook includes three examples. The first one removes the
# "# Please enter the commit message..." help message.
#
# The second includes the output of "git diff --name-status -r"
# into the message, just before the "git status" output.  It is
# commented because it doesn't cope with --amend or with squashed
# commits.
#
# The third example adds a Signed-off-by line to the message, that can
# still be edited.  This is rarely a good idea.

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2
SHA1=$3

/usr/bin/perl -i.bak -ne 'print unless(m/^. Please enter the commit message/..m/^#$/)' "$COMMIT_MSG_FILE"

# case "$COMMIT_SOURCE,$SHA1" in
#  ,|template,)
#    /usr/bin/perl -i.bak -pe '
#       print "\n" . `git diff --cached --name-status -r`
# 	 if /^#/ && $first++ == 0' "$COMMIT_MSG_FILE" ;;
#  *) ;;
# esac

# SOB=$(git var GIT_COMMITTER_IDENT | sed -n 's/^\(.*>\).*$/Signed-off-by: \1/p')
# git interpret-trailers --in-place --trailer "$SOB" "$COMMIT_MSG_FILE"
# if test -z "$COMMIT_SOURCE"
# then
#   /usr/bin/perl -i.bak -pe 'print "\n" if !$first_line++' "$COMMIT_MSG_FILE"
# fi


// -------------------------
// File: .git\hooks\push-to-checkout.sample
// -------------------------

#!/bin/sh

# An example hook script to update a checked-out tree on a git push.
#
# This hook is invoked by git-receive-pack(1) when it reacts to git
# push and updates reference(s) in its repository, and when the push
# tries to update the branch that is currently checked out and the
# receive.denyCurrentBranch configuration variable is set to
# updateInstead.
#
# By default, such a push is refused if the working tree and the index
# of the remote repository has any difference from the currently
# checked out commit; when both the working tree and the index match
# the current commit, they are updated to match the newly pushed tip
# of the branch. This hook is to be used to override the default
# behaviour; however the code below reimplements the default behaviour
# as a starting point for convenient modification.
#
# The hook receives the commit with which the tip of the current
# branch is going to be updated:
commit=$1

# It can exit with a non-zero status to refuse the push (when it does
# so, it must not modify the index or the working tree).
die () {
	echo >&2 "$*"
	exit 1
}

# Or it can make any necessary changes to the working tree and to the
# index to bring them to the desired state when the tip of the current
# branch is updated to the new commit, and exit with a zero status.
#
# For example, the hook can simply run git read-tree -u -m HEAD "$1"
# in order to emulate git fetch that is run in the reverse direction
# with git push, as the two-tree form of git read-tree -u -m is
# essentially the same as git switch or git checkout that switches
# branches while keeping the local changes in the working tree that do
# not interfere with the difference between the branches.

# The below is a more-or-less exact translation to shell of the C code
# for the default behaviour for git's push-to-checkout hook defined in
# the push_to_deploy() function in builtin/receive-pack.c.
#
# Note that the hook will be executed from the repository directory,
# not from the working tree, so if you want to perform operations on
# the working tree, you will have to adapt your code accordingly, e.g.
# by adding "cd .." or using relative paths.

if ! git update-index -q --ignore-submodules --refresh
then
	die "Up-to-date check failed"
fi

if ! git diff-files --quiet --ignore-submodules --
then
	die "Working directory has unstaged changes"
fi

# This is a rough translation of:
#
#   head_has_history() ? "HEAD" : EMPTY_TREE_SHA1_HEX
if git cat-file -e HEAD 2>/dev/null
then
	head=HEAD
else
	head=$(git hash-object -t tree --stdin </dev/null)
fi

if ! git diff-index --quiet --cached --ignore-submodules $head --
then
	die "Working directory has staged changes"
fi

if ! git read-tree -u -m "$commit"
then
	die "Could not update working tree to new HEAD"
fi


// -------------------------
// File: .git\hooks\sendemail-validate.sample
// -------------------------

#!/bin/sh

# An example hook script to validate a patch (and/or patch series) before
# sending it via email.
#
# The hook should exit with non-zero status after issuing an appropriate
# message if it wants to prevent the email(s) from being sent.
#
# To enable this hook, rename this file to "sendemail-validate".
#
# By default, it will only check that the patch(es) can be applied on top of
# the default upstream branch without conflicts in a secondary worktree. After
# validation (successful or not) of the last patch of a series, the worktree
# will be deleted.
#
# The following config variables can be set to change the default remote and
# remote ref that are used to apply the patches against:
#
#   sendemail.validateRemote (default: origin)
#   sendemail.validateRemoteRef (default: HEAD)
#
# Replace the TODO placeholders with appropriate checks according to your
# needs.

validate_cover_letter () {
	file="$1"
	# TODO: Replace with appropriate checks (e.g. spell checking).
	true
}

validate_patch () {
	file="$1"
	# Ensure that the patch applies without conflicts.
	git am -3 "$file" || return
	# TODO: Replace with appropriate checks for this patch
	# (e.g. checkpatch.pl).
	true
}

validate_series () {
	# TODO: Replace with appropriate checks for the whole series
	# (e.g. quick build, coding style checks, etc.).
	true
}

# main -------------------------------------------------------------------------

if test "$GIT_SENDEMAIL_FILE_COUNTER" = 1
then
	remote=$(git config --default origin --get sendemail.validateRemote) &&
	ref=$(git config --default HEAD --get sendemail.validateRemoteRef) &&
	worktree=$(mktemp --tmpdir -d sendemail-validate.XXXXXXX) &&
	git worktree add -fd --checkout "$worktree" "refs/remotes/$remote/$ref" &&
	git config --replace-all sendemail.validateWorktree "$worktree"
else
	worktree=$(git config --get sendemail.validateWorktree)
fi || {
	echo "sendemail-validate: error: failed to prepare worktree" >&2
	exit 1
}

unset GIT_DIR GIT_WORK_TREE
cd "$worktree" &&

if grep -q "^diff --git " "$1"
then
	validate_patch "$1"
else
	validate_cover_letter "$1"
fi &&

if test "$GIT_SENDEMAIL_FILE_COUNTER" = "$GIT_SENDEMAIL_FILE_TOTAL"
then
	git config --unset-all sendemail.validateWorktree &&
	trap 'git worktree remove -ff "$worktree"' EXIT &&
	validate_series
fi


// -------------------------
// File: .git\hooks\update.sample
// -------------------------

#!/bin/sh
#
# An example hook script to block unannotated tags from entering.
# Called by "git receive-pack" with arguments: refname sha1-old sha1-new
#
# To enable this hook, rename this file to "update".
#
# Config
# ------
# hooks.allowunannotated
#   This boolean sets whether unannotated tags will be allowed into the
#   repository.  By default they won't be.
# hooks.allowdeletetag
#   This boolean sets whether deleting tags will be allowed in the
#   repository.  By default they won't be.
# hooks.allowmodifytag
#   This boolean sets whether a tag may be modified after creation. By default
#   it won't be.
# hooks.allowdeletebranch
#   This boolean sets whether deleting branches will be allowed in the
#   repository.  By default they won't be.
# hooks.denycreatebranch
#   This boolean sets whether remotely creating branches will be denied
#   in the repository.  By default this is allowed.
#

# --- Command line
refname="$1"
oldrev="$2"
newrev="$3"

# --- Safety check
if [ -z "$GIT_DIR" ]; then
	echo "Don't run this script from the command line." >&2
	echo " (if you want, you could supply GIT_DIR then run" >&2
	echo "  $0 <ref> <oldrev> <newrev>)" >&2
	exit 1
fi

if [ -z "$refname" -o -z "$oldrev" -o -z "$newrev" ]; then
	echo "usage: $0 <ref> <oldrev> <newrev>" >&2
	exit 1
fi

# --- Config
allowunannotated=$(git config --type=bool hooks.allowunannotated)
allowdeletebranch=$(git config --type=bool hooks.allowdeletebranch)
denycreatebranch=$(git config --type=bool hooks.denycreatebranch)
allowdeletetag=$(git config --type=bool hooks.allowdeletetag)
allowmodifytag=$(git config --type=bool hooks.allowmodifytag)

# check for no description
projectdesc=$(sed -e '1q' "$GIT_DIR/description")
case "$projectdesc" in
"Unnamed repository"* | "")
	echo "*** Project description file hasn't been set" >&2
	exit 1
	;;
esac

# --- Check types
# if $newrev is 0000...0000, it's a commit to delete a ref.
zero=$(git hash-object --stdin </dev/null | tr '[0-9a-f]' '0')
if [ "$newrev" = "$zero" ]; then
	newrev_type=delete
else
	newrev_type=$(git cat-file -t $newrev)
fi

case "$refname","$newrev_type" in
	refs/tags/*,commit)
		# un-annotated tag
		short_refname=${refname##refs/tags/}
		if [ "$allowunannotated" != "true" ]; then
			echo "*** The un-annotated tag, $short_refname, is not allowed in this repository" >&2
			echo "*** Use 'git tag [ -a | -s ]' for tags you want to propagate." >&2
			exit 1
		fi
		;;
	refs/tags/*,delete)
		# delete tag
		if [ "$allowdeletetag" != "true" ]; then
			echo "*** Deleting a tag is not allowed in this repository" >&2
			exit 1
		fi
		;;
	refs/tags/*,tag)
		# annotated tag
		if [ "$allowmodifytag" != "true" ] && git rev-parse $refname > /dev/null 2>&1
		then
			echo "*** Tag '$refname' already exists." >&2
			echo "*** Modifying a tag is not allowed in this repository." >&2
			exit 1
		fi
		;;
	refs/heads/*,commit)
		# branch
		if [ "$oldrev" = "$zero" -a "$denycreatebranch" = "true" ]; then
			echo "*** Creating a branch is not allowed in this repository" >&2
			exit 1
		fi
		;;
	refs/heads/*,delete)
		# delete branch
		if [ "$allowdeletebranch" != "true" ]; then
			echo "*** Deleting a branch is not allowed in this repository" >&2
			exit 1
		fi
		;;
	refs/remotes/*,commit)
		# tracking branch
		;;
	refs/remotes/*,delete)
		# delete tracking branch
		if [ "$allowdeletebranch" != "true" ]; then
			echo "*** Deleting a tracking branch is not allowed in this repository" >&2
			exit 1
		fi
		;;
	*)
		# Anything else (is there anything else?)
		echo "*** Update hook: unknown type of update to ref $refname of type $newrev_type" >&2
		exit 1
		;;
esac

# --- Finished
exit 0


// -------------------------
// File: .git\index
// -------------------------

DIRC      h���L��h���Z��          ��          ���L���8�X�W�!5HK< 	README.md h���p1hh���p1h          ��          �G8ul��]���2�����7� backend/main.py   h���}i h���}i           ��            �⛲��CK�)�wZ���S� backend/serviceAccountKey.json    h���}i h�����          ��          	^�� x�֭݃=����� frontend/.gitignore       h����V@h����V@          ��          �qͤ威uZ��ma�0�wVm "frontend/app/[id]/profile/page.jsx        h�����h�����          ��          c''_r@�'��M����n#  frontend/app/client/page.jsx      h����x�h����           ��          c*��etw)@�U�����a\  %frontend/app/clientId/client/page.jsx     h����l h����l           ��          LYou���)��7����|,Q frontend/app/discover/page.jsx    h���
�h���
�          ��          eKq�o�H5�-$j��ݷ��v$ frontend/app/favicon.ico  h����h����          ��           =U*a����?4X4�01��܂ frontend/app/globals.css  h���3�h���3�          ��          �����R`�e���Q�T frontend/app/layout.tsx   h���C!h���T��          ��          ޟ~�J���w�K�"ʍ�a frontend/app/page.jsx     h���e�th���e�t          ��          O��̏��M�w��a��}�]�N frontend/component/page.jsx       h���u)�h���u)�          ��          E�kD:�7!����V��^ҭ7 frontend/lib/firebaseConfig.js    h����?0h����?0          ��           ����:�y��_��圲S�9� frontend/next.config.ts   h����BXh����BX          ��         ~@�3G��A��G��V�UF�?A�| frontend/package-lock.json        h������h������          ��          ��ʪ"U
#��,X�9�o	 frontend/package.json     h�����h�����          ��           VǼ����^%�,�E)��*}� frontend/postcss.config.mjs       h����yth����yt          ��          � AE��?��W��Yf���Bb frontend/public/file.svg  h����Ǭh����Ǭ          ��          V����f,�5}�H0���� frontend/public/globe.svg h����zlh����zl          ��          _Qt��V\(^>1.���O�ʃ� frontend/public/next.svg  h����ih����i          ��           �w9`3N.4�XM��\;L̩ frontend/public/vercel.svg        h���	;�h���	;�          ��          ����On�p�P<��;��Q frontend/public/window.svg        h���	;�h�����          ��          �/|v�VםT��ŲF��� frontend/tsconfig.json    h���,"<h���,"<          ��          �A7H�1Z���{�5���Gn�" package.json      TREE  � 25 2
��6��	��ݵ�������backend 2 0
��m;=��l�PhK��a���^frontend 21 4
j|&ᛀ=R���FTIͫp��app 8 4
��eY��烻�*�͓4�C�{[id] 1 1
�'{k#sm�(�����0profile 1 0
?�M��ѡ� 4
%3@]	client 1 0
���JT�-����C(�T4�clientId 1 1
o��J���^���a$�_Zbclient 1 0
�q��xGl����,discover 1 0
����"s�u�t�=f��q��lib 1 0
2iw���i �$�]���[0Apublic 5 0
ȏ8���A��vY�B�x�O��rcomponent 1 0
G�{O�� 8�<���~j%�g4�
/�~)��mb�G���

// -------------------------
// File: .git\info\exclude
// -------------------------

# git ls-files --others --exclude-from=.git/info/exclude
# Lines that start with '#' are comments.
# For a project mostly in C, the following would be a good set of
# exclude patterns (uncomment them if you want to use them):
# *.[oa]
# *~


// -------------------------
// File: .git\logs\HEAD
// -------------------------

0000000000000000000000000000000000000000 58d3e6f60489e8afce816d20571b2428236f678e reallywasi <reallywasi@gmail.com> 1753461220 +0530	clone: from github.com:reallywasi/BookMyGrad.git


// -------------------------
// File: .git\logs\refs\heads\main
// -------------------------

0000000000000000000000000000000000000000 58d3e6f60489e8afce816d20571b2428236f678e reallywasi <reallywasi@gmail.com> 1753461220 +0530	clone: from github.com:reallywasi/BookMyGrad.git


// -------------------------
// File: .git\logs\refs\remotes\origin\HEAD
// -------------------------

0000000000000000000000000000000000000000 58d3e6f60489e8afce816d20571b2428236f678e reallywasi <reallywasi@gmail.com> 1753461220 +0530	clone: from github.com:reallywasi/BookMyGrad.git


// -------------------------
// File: .git\objects\pack\pack-1278ab3f7501dcdd69a85a2da4943990d813cb3c.idx
// -------------------------

�tOc                                                                                                                                                   	   	   	   
   
   
   
   
   
   
   
   
   
   
               
   
   
   
   
   
                                                                                                                                                                                                                                                                           !   !   !   !   !   !   !   !   !   !   "   "   "   "   "   "   "   #   #   $   $   $   $   $   $   $   $   $   $   &   &   &   &   &   &   &   &   &   &   &   '   (   (   (   *   *   ,   ,   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   /   0   0   0   1   2   2   3   4   4   4   4   4   5   5   5   5   5   5   5   5   6   6   6   6   6   6   6   6   7 AE��?��W��Yf���Bb��*û8�R���+S�/�+�ѳ��hs�r��~o��J���^���a$�_Zb]�kQ���r(#�*�%Z��N\��6��	��ݵ�������'_r@�'��M����n# ,�YX�'���'��+�ώ���/|v�VםT��ŲF���2iw���i �$�]���[0A=U*a����?4X4�01��܂?�M��ѡ� 4
%3@]	A7H�1Z���{�5���Gn�"G8ul��]���2�����7�G�{O�� 8�<���~j%�gQt��V\(^>1.���O�ʃ�V����f,�5}�H0����X�����΁m W$(#og�\�b�4i"�|����W����9^�� x�֭݃=�����j|&ᛀ=R���FTIͫp��ou���)��7����|,Qq�o�H5�-$j��ݷ��v$v�,�X�vJ[��L�;2�rNw9`3N.4�XM��\;L̩}������n	��Օ���/�8~�J���w�K�"ʍ�a��m;=��l�PhK��a���^���JT�-����C(�T4��Mvn�x{={�(��<h��M��(��A����� `uDP�Y����etw)@�U�����a\ ��A�`�B|��V�k�R8��E��]3����>6�]T�A���\���X�=-��\�'�����On�p�P<��;��Q�'{k#sm�(�����0�3G��A��G��V�UF�?A�|Ǽ����^%�,�E)��*}�ȏ8���A��vY�B�x�O��r�YS쭍���@6 ���a���Il�.eam������ͤ威uZ��ma�0�wVm���u] Gt����ƞ���u�q��xGl����,��L���8�X�W�!5HK<�eU�����7�z�3U�/J��̏��M�w��a��}�]�N�⛲��CK�)�wZ���S��ʪ"U
#��,X�9�o	���:�y��_��圲S�9�����"s�u�t�=f��q���kD:�7!����V��^ҭ7����R`�e���Q�T��eY��烻�*�͓4�C�{��9��J-Q](zEZgCmzZ�����z�����RX��l���Nd�d�q6G}�x��a�K�/��U�U	����4�A�B%@��]�`{�����?��B~�P���"��"�5���M93��`�g����|�J�2u��P�o"?D�&�LN%��h�0ͬ�ZTq��!�(l�W۽e�q�nv )� ����I����5�A7r{	 � $� %�  �:  F  �  �"  J !�  �<  ��  5 #%  R  � � �      �  	�  	�  ��  �o  d  � %�  �E  �  ko  � &e  k� $   l $� !  
  � � '  5  I  L�  
�  �d  * $�  �M  , �  Į  ��  �t  ��  �x�?u��i�Z-��9���<LA����I�܆�bN

// -------------------------
// File: .git\objects\pack\pack-1278ab3f7501dcdd69a85a2da4943990d813cb3c.pack
// -------------------------

PACK      7�x���K
�0 �9E��$�D�CO��ދ-ش����k�.g`�7f�=QQ��%�NGR��&���l��k�	�YX���|�\ &v��&V1�d���Ok�#�7�s�@ky�O��������ܥ��!x��E9���.s���BAg����s%��IĚx���=�0@�=�Ȏ�b;n	!�Pq 7q��Qn�#0~oxu3�rυ��,Z2#�&��\8&�!���[u��z\zhz6iI� 2kIC����ޗ�w:��������S��m��q��t��2E���Sp�:���w]�V+�
�lD��x���K
�@�s��2�逈w�g��̇d\x{#�UQ��M�*ޛ\����Tj�⁬��`R9��V�dnС��d�0e�FRFk�UW"���Dϊ^mX6�i~S?���k�ϴ�=&��LW0)8�6uN:8��:����25a(�43��ɲ��@!L^�x����
!E�~���>5��~�9����	-�wq8pnf�~��36K����[
ڦ9�
��QE��h�T���-��Ƿ{�\�S�W0'�&�18葪ak����Sr%�a��v^g�ީ��<�	x340031Qrut�u��Max$���p���k�_*�zx�� �BRbrvj^
C��\kۯ}9�2�g�L\��63�"�(?���td������X:7;�)�d�w=q�!Ħ�)��zY��y�����>Q�l�h�*6���J <�7���x���8�qB�HV����
�A�W�s�<���݁�Y ��
N�Zx��Tmk�0��_�Q(4�¾�+�{���8���ʝ[;
�����Ov�]׽@���,�y���6�|
���;/��קk�)���(�qAaU��5COđ��&4����e�*�&�7���ұ����	8`�Qc��m��Uut��l�|bMU��!�	�4�ޢ����1�b8����z��8��(I�P��*�[M9~X��D9\U&a�����rk�|����t���v=����a�If�2g���/�@�bhl��S&�B����a�w��T�^p��-�j��S�&#��h1w-�J��:�FWYӽ`)J�����u�d��	�'��Vlilib����:�� �8^���.E�
8R��h#ߵ�4��&_��'b�7�0(o��@>�y�o1k��
4W�^��zJ;ߞ �ٓ�tj�9G�̨� �4FqIs0;\�N�B��������%b�����7�\z��/��-�rMq���lo�P���`��g�F}��2��g^Z~�z7Q�rh{�o%�L}�zf�L �r�b���J���(l�2�G�ݠ�����p��#Qx�I�]��*Z���n0sR)��P,�����&˹|t�Ek��;���o^̝���A�-j�$��X�.��� ��Y���I	i�'eW�à<D�x�a��p%�B�D���3��yf��2��\�����r	��
��N��	u�N�x�340031Q�M���+�dp�(���Ⱥ-vٌyFL{s���!DIqjQYfr�crr~i^�wj�^Vq~ó��fo�x�ٻ[s]yԍCOz�' yF$|�8x�mSM��0��Wᒢ@�T)eaE�B�v{[��Y{�$v���������6>%3�y3�F�P�u�0p�h����nn�)��K��nw����ƱVQy��j���ʄ6vҸ�qw�}NEc�dCOh�@Y�$��M|aH�r��M[w�"l�'s�*�^æ��	��r�$8
(Y�JY�&�����1B�6�ge��M�x��p��L� ��Z��t �d�Dox�8��_��o��}���B��E�슌�:JbK�Ȃ6B�V�겟V�x-g��\��CH����)dO.��y���wX�]�Z��
��(��~���x
�g��pM�����y�j�
ZG2\vo��(���S���(�Db�UZO;5|Ҳ��	�������,���`*�#���p$	-��	���>&�d�Xʹ�향oy����{0�o � h���
����cI�+q�-�b����ԫ;�*����(,���).�0x�    �x340031Q�K�,�L��/Je���T���iᵵw�mxN˝:��� 
Ξ<_��^�{�����z�@�"���[����W�������Q��6�~���R}��Q����`�Y޴jZ&�5���><�6p4��"/��D/9?/-3]�������V�*�������M�/�Z��,HL�NLO���O���*��c�c��o���k;�f����;>�AUQ���*%�P^e�փ:-y��s����$�\��U�p|ϖ��D�Ʃ���Lv�\W��'�+�I9��'�-�>��ػ�,���EE����EP�J��^�O���t���!�J��$⶷�4 �O����Tx� �����0��eY��烻�*�͓4�C�{�D9BS�x�eP�n� ��+���F
�{��T⊗�Yu��&鶪z���3��+�ژk5f�Xu ��E���mL.b7ri�üҀj-M��P٥��:h
pQ+f��v0�x|O��q ]s�q�	�ݶl&x:�j�m���(���m��o�:�e cg� �iۀ�����9*FܚA�&f�̲S����;�o��+K6�t�tfY� ����t,a�a���J;���G a��+R��fU*ϔ�eʶ��h��ѿ��!�D#��{ĽW�Qe����@y-0�΢�^��B=�]�x31 ��̔X�=�����ŹG�5�>��b���&`���Լ���^z�,���zTp��ƙz����
<S8�O���P��u�Un��F%A��d'痥1����G��J�ݒS|�iK��8ah``fb���X�����$
{�_y���U����ww��Me*<Pe�9�I�9�z�����Z�_��h�7�0Yd�n8���&����������
���_�%���*}D���@ɧ!PU��zY@5e�ufE�/c��^;���:k�E~ 
r���x���4�i�H�j�G�3��/�~��w��Q�{" �s_�x�31 �����̜T��l�|�N_\�"�`¥j��	 �4
5�x�340031Q(HLO��*�`8����Ҩ�C�+r��/�� �ܾ�x�}�vǱ�?E�	���DQ��ʦH�V"Y�)��KK+ b, �� �hn�u^�<�y��(�I��U�m.�M���+���LOwuu�W��^Y��鏳t:_��_d�Y^��wiҟ�6��͓yz����in>�a�O�J���}��<K�Ҥ�n�Ӌ�x4�-�=~y=z��h�Y�E>O���--�Y>�ϊ�X~:=I��L>����d��ޔiq8^��|�O�O��� ��Z����g��7�tp�g�yZ���|2��������T�<LpÓbQJw��<�2�e��6w�N���~�k6Hsi.��E�O/�~��F�T}�����E��񷽢�O�qb�/ҡ��u6I�3����ȧ�锏<)�t�OJ;F�:��ϒ~�����x���ln��"��O���O�yr\$~!������f�|Z��x�J!���|�t�`� ^R��y1pw�Y��г�d1u�)�	�)_w����Z�%�����`N��W*/�;>���;��}ws�)�*�y���e�o�A����㬷�ް�O��q��b6���|��O��9� U�fV�?b���<1���Ɯ���d��fes�|�g�q��GIrd��`�5�,�M��ar����E���i?-��ၽ�Yb�FI1I�<�r���o�o����LV�{�nΰ*K�M�a���Ц)gi?K��O|k65�i�$��8�'\��A��tq6N�ü��k�]Y�GP�$�S�Pt�X\E�7y�m#<����<;��h�����p1����Cpu����	�W`,��|V>\_/�l>��&�Y�N	U$ټ\?ͱ�׷��~�ۖf�	�����a/e5j�H���K1Ǻ��hm���'���x�D��i9����(�R]�,pr�3��6��Wa��"��\h}ϔ�4}���a�����$�)ۄa�P�
���L�SKie�5�z����pS��|
9��4'�x���Y^��9�:=N�I�d������i2�ei��xܝ�]�l<Q�yn&��̢6��N�k�1f��K��0g�3��4Ó�N��R������L�6����$cs����=Lt}A'�)���7Pc*��,.�����9�8�q���`i��yַS���O�M���X� �"��8?
������Ѭ��]���#s����)@s����LZ��PK` �j�)U�AM�#���y:�+"�Yq��G�|�g)��,;��6+߼~��.?��1�G����)9I���̪�i��}ړ1�C��r$y�l���y��C�A��3{��y�|����
�s �̋�)�T��v�
3s�D�W����\0 {a�)
H�t8�� ���R�^�m{�A����Z3ϱ���:�)�����B�!̤��η��ͼX��Z���̟(�(��l��wi9�ɝ�S�h�
��5YK&
�k6���?l�HGX�\�V�Av��4	�� "���9����pYu�@M�l~f& ^�.s�EPi��|~6C�\��:�>�
:P��d��o�Y�o �g3�Z�x��� �J�����{�17�J�Vt4��I�	�{�&X!���VA�Lt{��r�I�腰Φn!��J!Q�xd��A� 9����FA� W(����Q)��dfH[&E�O��!iK���,[`� �_���� ��o@G@��?����%�S RX��K�,&��@2��7_/��xY���S�S�����}>�� /�޼ȏ�e�j4�S��lҸAE�6&2;=e���1�� Ț���(E21��f���%�M�I^$=�B�{)n�dNu�HIT(��q
����zy0 p�@���X �4��@*�x�b�4��@��{-j��/����B@����0��C\s�B9R|��6V�j���Ҏ&��s��B�Ō��
�d�j`f%�DP�Z4�e��|z̗����/2��
}Dd)�:`9�a�.�*o;� h�M2�	�@X��T�,�Fh`-��D��',f	��2�2�5GD-X}G��?"�	�@h�,B�A@�<�qHrX� �X^A�<w�)/(#T�o�ڼ�|z ���0�쌬��sʘRdPZ�j$۶��Xrd����,�}������5,+km���o�*ɴq�
�����E��o����?V��a�2�0`�sp0��?)9Ά�b�^i
Cө7:d�{`v-yA<���EZ����ž�F?�_c��Τ�� P���H��pQBH����\����fyK�OU9J!�Ed2��
�R�Y�%��i�Y# �b~�f��� ��{�Pzt��?���à�-�^��16
���@h<�� v
��.��z���<�0_��t����Φ�����-��r1�`�a6�( V8s����Ky����*0�'߶��p����dD%�0F+X��*x��<|M�,뻁�`W�V��3�M��p��e�	�t�?E܀lEc06͝q�Mq+9� \���H\B�p�II8��Kj�`��t!��P�K���H���V�:M�ͻ���ރ_�8|>�{;�p�a��
�����eM�B[|��g��kv�q���8YZ�߀ip�:oNi:R͟�����@�Rҥ 1e4��۵]@���N  R�y�pyjFi�sP���]���/'b �9Ѕ �!2H`gU0Q�xPX�V�iAF�{�UZ�vk
�g 0c�k"`�U�;�\��U��
�\5\����/�I�J�'�֑�b��i��ɀ��x���8O [̾.�����m���,����J�15��T���
	v�����P����/�	�J�&]C'�(H��������7Q�x�Yf}�'�rT	��haJ@*���w���P��[���/.����K�GN�gY8�U�
������a�(
�Q�[�N	8��l;�D�:��[�>=��#1 �%4 Q����-⣀�᪥
 �L�J7��?�sO�[4�t����J7�(��`��8��S��%|1ܒ�#�{�~1Q�g9ʼ�w��x>��fF�u�
%���N���)5�0����u6���Xϙ�pşA -7H�N	�KI\�������= t/�^@m �m�}����.��Œeג���UAޠ�:Ϗ�$�8+�r��}�.J��.9� r�B0��F�Q/����#�b(�x���C�p�&+z-�N��,��n4a�ļ�BtY�����)
�aJ�J�ε���� {����$�P�Z>�� ,� �KUY�!�i��CA���r�v���AZ�0g���v!?Gh$JŨ�1��`��h���K�H]5�Äp�f�|���Q#f��W���Bh��`(N�۲��(��'i�^P0d�qh�H�X8����E*�v��N�(���h\�G�UGce���}2O����A]�=p�������D��[K���ݒ��t=8z�������� 8^0�P�9\��Ďk��m��,��)��~MnXX��3~�"����� ͨ�kȎ?��3�����P�3�ܺ����IJ��.���¹�X�=�;Y�ޥD��\:b���p1ED�s�h���*�I��iw��-I�+�m43�M�@�F�
��U5�
)���4M ��h�U�ȉ�v:� #II6�/v�X
@tL��޿wh�;Jl`X�G��	г�:`;"8�%9�� �/�G��H�pKE���O{i`"$^�U�k>�chޱ���o]�y��F���߮D_��� A�@" z0��xj.D�1i�GY�߂��G�#��^��O(� ��f��G�|��8)�K�t����E����+���'�R�H7�|
@`1��2���O�w FָKMUt;/��&�Vw1=O8m^@�$��5%A�	�IS<�,K�h�p����0HD�\���^���X��3�w�l���
.��.�1��d: ��� A����/��N�*�^��cd,��,H�)�"8a�-r@��!D����'�na����.a�� �6l}Vu(B�B`��k����=2bğ��<h�jpB�^�_ ���r��:Eu�S�b�+玱|
l� M�� �Z�R������e��`�	+"�Epk$"�~�Q��0�.����A�q��%ao�F- <N ��ّ�p��qۘ��O	M_� &@�f������y^��$I���V��/����,j�Ԥ
w�R� ����:dOo�nQ��Fӑ*C�
���:�����sʆ� C�?H�=���.|����N�b:R�Ty��c�n�����v�_+ϼ}?�l����7Q�K����?�FO>����ʳ
�`��!΁�&�Py�1!S�(��d�6�PyT3u�c���Y_7+�Bb��Y)�-?�tWmh%��/�q,W����uLiʉ���U�9U*�K`�g��
��q��>�)D����3?��
�r$��DWH�U0�oM~��b�ӡ�����7�1tV^�1Z�D��������b���y�S��\$�,��o���M�LY�3�t*�[��o��Y�|[G�k�1��Р|�U�u�č�a�6��$o[�ae���Y�bP�4.�� N���!�t�d�.�/�P2��bUPa�X���G^�.�z��ꮢ���?��؋�p�#f����L��� ����׼�,9�Bv1CxQ:C��#���ͤ�����<X�eP ^J���*��6"�H%ݧ"��"�������bX��7��\���ΐ�
������Q6@J
�A�
}e�h���Ed��M�w����i����1��~�^ɩ�q����Ǭ����� I
ٴ\]�����ӕ[��!}u� NMQ�7�
���+�����8���B;M�e;���U��ֶ��
ީJ''�e�j��s�t*ٽ��I�
���/;�36����	�P���{��i?�2 N"6d:�;w�G�ǎz��尪)>���\^s��n��U�$�r�"O
��>��� ef�%Lh�@}�;�a'�;�R20�yaj��)"�;��X[���a���cN2�3(&R�tT�aW�.�}��$��k�OC�J����@�b�����g�i�k�px��������`E�!Z ^ ���jR�����3�˰`�f�/3_b\�M��N|_�n�
�w��M�9���g�>Vi�)�������ZG�k�5Qh���g����5���1.�X��D
|$}H:���)��eW����-�TV-�rjDiD��˥?�1y�i�.�7
��
�vޠk|�T@Ç`�jg��5z�)�R� ]�x�!9Z� E�	��S����$Y!�G^0`1Đ��m�Xn�|Ҏ
%����7��_���OER���C���E�� Z��0K�p�9�W_!*�=݄/9�s�f>p����V��e��:�`�KA�9x����;Z~sЪ�Cz�#�C@�������_�e�tC2�RO`��M�92��&�{ܿ�6y˴���"�Fݲ��8��qg 8����u�T��x!����W����CO,��mCy�����D�7x�U)`U��ү�b��d�S���M�^!pG�E���_ T��ٷi*������S\�ۃ$�X�EP�ۤõ^�b;�8"�+�XC�r�X��E:��Y(Gװmy�r���]s.���V�@��z��S��#����f��Q{��S��z���PtY�`�e�$��,�Z�A�]�?U���/}�Ş)�X�,!�C�l?-�o���Abpi^���WW�/`��� �-�¯��5Yl��L"�� �j?@�\���t�b#�
�0fhaϡ^}JBCW��b�� �.��r�>����D	�ƽNHWnu�&�G[9t��r��Z������<�p���ꗪ�t��7YD%;gWaݭzL"p��&�RpCv�2��5"<�M&��m�v�yd3>��M�A��C��NVѼ��� e�`DDp��z��dj?��Z�Vi��@}�B�~����/�n ��?�
����s��;;ˠ^s�< S��e�}\x��׎ǀ�f�nT!2b���+x�"7U�6�p�F��_`����;L�R�Q�yj9�\R��!.��k�
q첋Y����vϤ �Fs�C�P�?q��>[Fu��
B��K,Ki�r�u��s#I�
�(��p�3���ŮD���}���&����1P
1�q�`�w��w��7�vG]�۰����R�|���7�lf�mݩ�G#��-�2Vlfg�mP5�ݷߚ}����*�{���m���q��;d����Yw���}�D�w����G���]��m۳��.x%7���C��HkȆg�^:?��3)e�9T=��"�;zC�B�;����s$�I6{��ΏG��n�N<�L6E�(��i�����`�U� LĻ�Y��'����:��r۔�V���@��]lT4�\��Ϋa"�G�"	 �-Y�Du:�R���u�F�w��ǿ��w�׃;�~�]�o�J��݊�GX���_����@3쨍8�ڹxh�s�t*S]�9R����R~���e>� cI��J��(yqd�79;���ݡ��]�v �ټ��=S\[���Kls�`2����r�M��N�%�?j�@��퇛���[�$�U�;�8�wC{�h�1�s�����EH� @�Iѽo&g�-��E����rj�i���0Y��0��r�.���ET"�;,$��d�+\{��Е��m#n����O�����!ϫQO�q�=p��:�U� 
����ii��U6��-'
�=�q����Z�����S2�
�̯2%n:j�G���F�?�~��ˮ�hzk���M��@']Fe�ʉ
ե�$/�6R(��.��d�I����
vje�����L�7��@����D �;�0�P�F"1�L��b��6�-~�!;[�VM�R�2�!���z��<��^�L��k�7ƒW�$4q�j��
��u>���;<g�9�c-�e5�/�[�z?O\�67vnoݻ�yw��Z�V]e��o���3Zo��ѺNE�o�1��n�:�T_�IO��R����+���S�ޭ�TUE:M�Y�
Ğ�kR�.�	�@,�����o󴲘�l��Py
�?h������^wki#Ч�E�%��O����R}�*ݜP��ڨ-�`]�w�6Գ��x�{*�@Gd�X��6��8\.�:-<�-F���`��u:k�mIC�!IVÀ|7�k ���kr�/W�I�c.teZ�VH�����u���03
Z����eXD��ԑQh\�7�Fi�Kd��3&��X�w� �*}8�����@��u�M����o�
fV{����lR8R/�.߬Ma��ɣ���-��"}��.^�u��g-�*f$N��� .�;��W@I_V
�[5�|T"L��S��#�o�������G�|"8�W�H�ܕ����m��5����8�,�p�#|�s��l�Y��m�ѣB�c�����hU��?�̊���rРG���$�q���OwuC�0�w9�~h֌4�^Q��2*��Ix�g�$<�G��	Q�jn!���.kR�W��C�VA�o�U^�-MWBy�M������S�uGn�5�0j��
�r��=4�d�lP�9[������ʌ`���`KS��n_���v,4�g�w��l0�������I�a��a6��6��@�Un|�i���9cd{��-��툈p=��!����n��ټ�b����������@�V�	��bn�ʻf��x�l��|`�
+!�N��j7��d��"l���tWij#>6egED�  tI$�^"���`����G�X��:?���p'Ŵ��L�f8���n�
����i2�y'ރm�,�	�j��6.Ѱ�ڬ�t5����[:x�(�뿜v��C+�/*%��M�*��xQt��gC�X5T����-��x�=�v���6���|*�N��}�^X7����S�a�����f$��?�������$�2k;�l��A4X�;>L0�]�y���$�W�Zs��+|v>l��lḦ́fݬ-��A:>��
�u�B���z3� ,e8̹O3*v�&�\�?��AL�l�o���!���8��qq��h�$	�kQX9	ݯ٩u��1P����1��X��h���v����s}38ם� �o��]����e�n�NlG�Ѡf���u��#X���v$"U�m�g-fQ"
��2
Y�Eűt\y2�k%�!4���S�o*)qb�`3D8M�����2.ҕ���Z'feG�%�1�WsT��nw,^����X|2-��:���S�^zg*e�szʀ\�D\�K�Yu�Z?�w�~�n��O�sr:�u��}
��BK�.�v���V�T5��]�
�5:�g(�S<l�0�����r֭rk���+���Wq��w���T���\�@����<�\�>�f��;��{@���؆>���8��o��<���P���
�,�xЕ�1���^�����jU�V&�>��G+�Qal�<��e����:R�m�9B�
���t�VMԘ�@N�B�YTC�4��a��e����m�C�u��F@~�aF\��9)��jw�0�UV�?Ⱦ>�6v�"1�U2`i��Q&ueP�a:e~���ѲV�H� ��2��,�7,73�Bˬa�OH�!{���o�B��13�Q��09#� uUJ|���"�V3���R�u�͐���E��ԍ��dE5�>GG����Yr6����&��pY����	��0?�,tW��SYt(����blJ�%�1
)v":�%���Hzǒ�RĀقҤ�A�`�17#���r��\���s����:ǎ�������R�:*`��*��q
�$�IY�g������%��(�]��K�"W���k2�J,����c-B����o���lx^�:Z L3�W���ld���"F�*�)^�ڡ?C%N�3 Ӣ���G�;�|[����ܳAd� 2��:�& �S���%���P�rU�(�>��
97RP�7T����P�ڤ��c�x`�/��Lo��jN�iu��kxbsV�"��l��ϰF��X���Ie�SxA�`g��$x,%C.7Dn�:w*�C��Pu�g�8)��V���*PF�`3��,S�h�ԥ�=��H��uO�qoQ��qz?�J"���Ç�L���e��@����ާ��=`�cB���¯!��h�k�D|�_�;����;��R�P�-�WDl_����hgg���K�(���$z�w
�4ueO�\�Ǡ޸8�8��,�3A�Z�L���D��#琧�AV*��I<�2e�d��h4�
bq٭���^�'�'Q�uVpԇ{�_Y��+%w00���Bi�Ĩ�dx�M�w0��{�uo�W&(.[� a8���1*���'�O�uU}d 9EߖuXuSTwb�D*�jAh�*��I���r#kt��a�I�V%D���k���'KC���A�;�����o��f҅��r�}�t��)�y��[�П;�|�n�;WH2�0�yӬ�D�����z�(��0��>P7&�R�C�k���g�5���#h8^j�y �c���SZ�Q��Nu#�����W����������s�-�]�hŖoZ��QN���8�����{��gYw��'�nd��;F�u�%	�ޚ���R@�5	�Z�%��g�b�-�-���Lܿ�0�=-��ơi���ev�%�	��e9C�z}I�Z^�6V\3e����
�6�G�
��k��+����#��7�Ŭ�r�v���]��ǚ�1��������1�8n�~�����q�x��	�5��ԃ�,è`��FЬ�Siz؈��� �q�n�ʰk�Cb�lڐ�^�_c�Dh+��]
YBeJњ+[�Myqs�D��_Y�B�q�wA�G�Lp�fRS#1���X���ۛ&����L�H�~x��L���/��6��a"�>�p̤�ɺ�u��s+�шf0?c}�U��]�H�`�v~�<�7�ahd�:��="�"$Y��r��
�r����Qv6(� :pB�C�*�(SzL���ix,,K_�^>�V���}�S� _����3��N/Ȇ]���m���
j����K�BxOmAƆ���_B��{~�'��oK�W/��v\ -g��P|��8B���}e�\M�\!��&C��bKp�}���$�@v�
��
a$4�r?�6j�2qD*U O��l�~x�2�HP<����c[l�U
���F��r��p�H����$����m�O�9NJI͑-@�xFr��rZ�����eY�q���u� [�<��'۝})�������	M�S9�����a˧�q\g�	
�FX3�5IsF(O��TE�u���<��>�~�>0>��%L�n�|<�g�ӽP�,���@P�����$���N��ԈGO���p��ڐ������g�(�>�i4LP���BWxC���	����N�v�5�=�����Q 9<�
OP��
� �eC�Xo1@<mͰ>+���:	
���D{�#'y�+O~�ǫzB��$s�5N����8ץ�^�vdD����)<� �u`i�Eyz�$ 0�,:�H��Z��N&�h',��1"��5�A�y9�c..��'���%?=��3���a����M<|��!�G�W���Kby�&j�k��ZT<��0�U��D"ϒ�,��ح��a��}��=Q���O������kE��4U�HY��i��yV_�w�4t�)R�=�f϶����T�V��U���'B��0u��d�=�r6�`�6C���6kg��S^�(�}4ڎg�ď�9�!rZ
�B#o/}W�!�0B���h�r˫�~v�\{�2W޳��\��S9�*�%�?���F#Bn��*��EH�)��RZӃ�T��H2BZIU^��sii���g�D�8%��<'T{��{�RW�3Kk��Tz�����
rJPZoJ/h���
g�ʥ������fh����"�SŢ�Ŕ3���s��|i�ȡ��Dm�(���V�A�I:O�}�f�!�O3Аr0�0x��z�� =��͹�D�Ϛb�d9U��[{�x�,�], ��BDXMN��$o���M ��x.+ԏ�M�)������I��/�}i�L�B��|}�� ��8��G:�!+�s8�G-1� x�uB�D�1+��'f��������xP��ƙ�8
�8�! ���ÞPwlV�d�u�OQ:DJ���bM�B�� �����eGp�q��M��B��	�� ��sC% ŧ)��<�t	�������r:5^�
�мC������5���v�1�l�:!���R��Tkr+�n��1�}>�}����p[n�*�S~��������&����9��npʟT��3`�[�X�8�gp:2,�	�lMU4�Ma�t,S�E@H�.`���U����k����A��(iN ��d�永0�͉
%ب1��ȐS�+��ӿ*� ��9u�{������ѽ��"O���x�����餒��5�q��[(*�&��ɱ.@��f1� C(�:$�ȯ��I�G�Љ��i_	����T�9�"��0 9�DϰB)��Y�|	J1�]�K����D���fs���x�*��B���j�o�<|����> -8)�I�@��	x��
�ݹV+f��ʿ+��w����F>�aֽ��=�Ո���+����R��[�c�.뭸��!���>��RƗH�����t�	��?\��y�p�C<_��ZO��[W}K*!��w��2��Ҟ=�,����&�>ΐ�p���
��zg``� Zw���P����w�c6�8��.��
ײ�hl˹�>������;M�#�,Ӯ�O�W��~�#��y���R#�X�j�pZ�-� ?�#��f��4��<�P��4m`�+د��퓖-}�p��ˠ&8�.��v;��K��ؖ�|[w��v��X[���Sw��M����eC�� �]ډ�G�u7h�U����g���WY_k6ķ����}���f���(فY%�����ۖ\�T9��gS�omϞ�8|ݶ	E�"r���S�gFȧ� l���=iU���?[�j��?��smE�dc`#�@V]�?���t�F�zqȪ�ٴ\(Y�Ѻn5��c�i�,����ң�^	
������:���׬�˄p�ON��kӷ���j(�N#k�%l8�;��u�.Y�n��̨�@_:j�s��P��1t2��-�������R��wk���s���rl���ղՠN�J�F �C�Z>Rj��HCb�5���<�!n��?��Mf|��K��_Q$ ^��Wܕ�ğ �b��f�9b ��K�6&���^�;P�,4��9�R趘D�AQ*r`�jt��Pt�m�_��3M��r����#������Z�+	���K��+U�*vìZ�PHd�� Ѝ�p���|u�w�pOx?6j!������퍼v_��lj�
,`�%�q��ʅ��~���o�����HD%1`�/�$�O�g(�������YG�Q⋼� ��[���RS�[",��&Q�0&�yh�m	���ܪ�)2��+X�2(e+iU�CR	��m�z�/���bӳ���%پ5yRY".�e���[�@��d��Y)��h�^0�u�Tm���̒!XY͂Z�*��[�cw�b;p�?�kE�H/g����6[[wb/�:�Ζt2�qxOM���Z��h]���0Lq閳�-d�СP��Z��E�E���R�gh�,_HE]���Dצ*�Z�5@C��%L�RC�^�U�QA�EGza3E2�
8�b�������u6��9X �CV��Z�n�W(��`�@�jU�vS�Z�6NFQ	�3Md����X<R�	�))�S��RӘ-u*Q��Q��RwD���,{K��}V�����ڭ�{�7�l�擺�ь�d^(k���ݒ�����{Ǧ�"��#�le�J[�q�:Zkl�g��d�8��Ԉ�v0�� ��\
�� �?=ƍ�����a�=�6������+�����[�喦"�E�3�>���$�V�vXU�����^K�o̵.�����.\;�n�t/V�,�#�k���sc:4�Irk䕢�W�}|��"X_�����r���M'����bOZ]g(sA��2	��-S�����6+[���Ve��g��CS8���edPVv�:c��'ʉIeي��朹���X�-�������\8i��Y;�isS#,��|H0���M��;�QI��D�������*2�5�4<���׸Vպ` L�߼���WpmQ�N�+�e��+�Z*4E��,���p۷��S�l�/�7Zŭ�(���G`�~T����N���R�j*^���N�O��;���c�ZZ�N#�%�79O� ��=8�M�`��|�z�&-��_qC�7��G$��a'LZ�|s���Z��Zq�]؎R����R��Qb�7݇r=7���PT����ϵ�~4B_t*E[S�Ù��e�J-̨�׸�Úk���%�t�I�V�\1ct�B5]ml�Ee�l�ղ�������]�|��DM.�^����2Q���n�n�E�/+�UmX�R>���^q"���X��+U_~�$V��
�V�{��E��K-��>$�P�w��D�k�~��'�g9*@ʲ{�0J$�!)��
D�?!��C�&�����m%o��_�Y�"���f�j?�
�����`��H?$�A�9��l�|٨�V-��Q��`VP��!]BF�bw���J!J���,���r@l�����Ӭ^
��Ǭ��A���K�6b��S�h��0��d�y�V�A���C�M���{�$�Q����
ؠ��n�9����Oc��U�����k�V��)��c�dY"�<�����u��=��d7=ki�R�~�2A^����N�c����fŝa�V��V�h[@]V�2��eTq��������y|�J�s�NF�-�S=���N��N�:�R��XQ�f���3$b"�v��������g������H4�ӨDǘE1������]�|��D�l1�N�F��L��ʿ��́"`���+ E�4��0���o�@P��uH�ț�q!�y폰���� �}-/x��qz0�;@$�C|k���:�-�1��M$m��[���!��I`+b���nNZGx�3��C�� �ǕV�=�h���!�JQ��HH)u��1Gl�$9,�&��HW1տ���+�]��^��ZOqH�[\��U?�ǂ�gɓ"K�Rb*�e��˲i���R7Nv����j��&�G���'��rf3TK%km����|C�n�1���Y�9�*�l)�	�fغ�#l��zQ�\��$�ŉ��e�
�q�V�Q�X���$�
��JG~�v��2�^g?X��_�i�]
&uX���uC�������TXH�ӛ�M�Om�>Xs�i���jg ��Z����� �x��U�uY�6�������jt��Y��ߐ�(�.d0�sr}&�5�yy���E^ H�B�1l�~�J�8���]a�^�Ǽ}X���aZ�]�	��O������\��0���=ѵw�������m��2��s��b���W{���5Y�5 h���j �U��і�@6�~�T�Og(��/<eV_٢G�n�^q�Z�˹4B	2T%��8�U�rS�M���4~2?-a��-��5[��Nlg��gl���J���g�������X¶u�e%�)M���ז�����?�
	#q3t���l���'������"�Avm�H4{hl�[����o�Z�ǜ�(�����e  ���a�@�Oa��ʯ�9��s�}r����kfݞ�c�|��FhaQ ��X4p�o�������:c��j��|�Fġ�'1���_�!=�Ӹ
%��A3�P����4�����u�v;wj�:�jg�"ٴ*� ROM��V,b#(�%g�����y���}g>�(2��Z�>��xb7���j�������ex��G��ui�iz��J ��ē�1V���W�z"�m�с�d�ج� �Y�N���>��_��d���qI�(�_%Մ'��v+�v�_l�E��
�6m��e,��[�lH��9FU�)
�=$������-_��nRhD�� �; ���7KFU�\��������᭧��8����o�(���)��(-
�h6�g�.w��l0����3���'���Ά�0($��,؈��%�G��^� \?��v$����Q��_xxy�l�o���̽�&D�N��oj?�#�8~8�1|�9��:9�{�G�>kr�ٗͰ`M`U�"�I��Dݭ?|���Bv�Q��$x�۷����
�ڛ��t��'��h��dd+�g�&�( ��9E��)�
I��٩)��=-�'o2l��O.MNN-.VT��/-RH�`�Ɨ�X������P��W�����D��J�zS��nr�1�dA��uf��0qA�ZYS) ���<�(�X!%_!/�D!7�$9c�DC��w-��tl>k���[vs��	����8���nF���\<��?�`F�́�=��;�B'ܖ�Yk�\���M�V6K4L�L�ݜ{�"# =�nc�9�x�m��kA�	[RjMkk|�ꦺ�bIJ����-�4)��M&����;�����]Zx��"^�R�'A�R�޼xO����&i�9���������
�y����m4P�	���.�ՠ��>�Wub��J�,jTƈa1X������0\�=۬i�$w��3x2>�[񾀀�〿����Y�HKV��jh�qg�"Fm�P��Rgݴ�"�LZ�lc�%��,�7��D���D(؄�*���f���"NML�ۚ��/4�ț@M��rkC�u�['�q��Pq�nL���������v�ĆZpn��L�E��n 6�͒
�;H6a%�*��IQjN�v�^
K�e��t�(����0���`��9�~�Zj���A��=·@���GY���+M�!�����f�GG���R����hrp	
��w��{�lwh�6����v� O��fҒ�l��B9�&-����G���HF�;�e����A�A�F��%�ц���`�n��~|��mo
O�s����Њ;ҵ�Yo�>]�y	(��5҆������n��f�f���\��T����)	;.��lOӷ��������0��ѵ��p��fgr,�=��1���ԓ%K��x��\ip[�}R"x�����HIK�  ��MQ$u;����l�M���#	�@�4�@j'>h��ێ����I�6��R��4v&��O�img����if���kw:MҴ����=�����3�=��o���ط?�G�^�l�3B��4�"B�Od<{+*p�RMCͣ�G��EHn�œb*���}�Ci>u(����:�J�O�&&3�׃�8�&IL󂘤C����<H�S��|$s8�M��8i9�gh�0���磱���@,"&ҡqN��{\�\@�D,�<��.�S(�e82�<�Qܧ��ݨ͑!%�8ߋ<�:3ɥ��㗺�)q�O�cbx��CG�a>�H�)e���o���mَ����	u,�qQ��x��L&��
�8�R�,��t6i𼞭�$��93��2+C�j��:�P,�l�&g�w���6g�Ʀ�%|��L����n=�D��Ok[8,�ws�㾴8�����D:)`n�1Jq�(��	�g���о4ǥX��Xb"��&x�E~,��|��ѥ�*o�߇Jv��X��~�T��S�I��o��j[u�J߰D�gu�������{X/R,��+R�9G���$i�����q2����]��Õ��lgX/K�7�X�������>�5�f�0��;�di!"-$I*�q	t���#S�4��Ɉ�ؓ\&��+�O[%C�`��'#x��p[g �h�֎���G' #�ml��R�$:4�'��Ns{�˒�c�4f��n�tL/.���P:�	\Jf�6�g� ��JѠ�s�KM���QF��L���(���{PxOokg~f�-�=Υ.���t�O�pK��m�-Q����X�Ǽ�X��YթW������(�.��~&6&�Am*�
{PkWoG;,<��=��r��h�϶N+O�X�>d�Q��<E�"�f�(���%�9�籘�̚����,f������U����EQ~��2h|*�[�����1�KE�>E&�^�E?J�}`F�Y����ὦ�÷W7e���tB�9��rfc�
s�y�����6��~�����ޞ,;
{��4��l�%�-�5=
y�R	��L���S��bQY���@L@�ް�T��]�2��X\2F�|d2!
��eLǼ�H������m`2�(
oJ���j�F�>mo��-��$��(mx����~�O�"5k�k�0P�9�NI�e���R�ŹL?���ΒJ� nML	��HF
����
�	��%y��a���
ҺҲ����Y���:{+��3�.q��M$w�f>�9�Trl�1bC�Y�؃f	ȠvMՅ��I�fKeV�J�W�
J�:|^ՈG���7��/���{��fu���J%T���'~埠#G��{&��߿�7�>I�����ɔ�T�k-�p��,��m�صT2[��@�D� &�k��?��>GVu ��ۢy� �t�b[1vQ�16R�bld
�g����x��頇���X��#��h�0�z���'&2�h7j�3�L
BF��J�#�ڪ$8ӹ���QD�ʹN�z?�t6Z�5��]ق-�Q����C7*����z%�(
Mo��g=�hZ��� yN��$&vJ8��D�4�2��
&qI�.2�f%��$��eK,���=�`�Kz3Y�I��
���^�O۳�+b��w(��^�Úap��+*���Fq*���D�g�zPf[�4ٴ�;�q�+ق�6�Z�=l��*s���I��;���|�dm;0'/�2�kே���S�i����;k�=�5%�E+=�C��0�ESk�h���\��{/WzLh����1�5�K�h"9�9�LHC�*�C�LG~h��X?��)��~�1ɸ\�e4K��i2N ���i?�2��ý��>_֜����)9%t�Ic�����%�>�(,BjD��iyz��Đ��mQ����j�h�[~�
wz�	�k�Mz�� �{�<�|����m]�K�d��S�GIq#�/4�F�B�����e�����8���E�S�L���'r[1�H�����7�	���D�^���K��)��/���$���B������v�>�̵�p�`��=R�)�K�!��Z�&R�E�"�<�>|ޅ���Daa�Ӂ?:�}y����<~ )���AxtG�h�۔a9��qT3#v�d������au����G��n��9���H�u�W"��O��)����N(��������8�z)�Y�h�a�ǰ�T�@}��$�\�B}��MW1�e�Q"9��G�#�x�骛E*�w���a��u�ū�lHC=���a$N�qA��
pS��l�j�vn�J�R������EWQ���k.���݅���~��o�m�*�>kb���CB,r�N�.j���pjK<>��Ei������Qce ��*D�l���T&#&$�����t���X��;C�n9�@a��(y�����)N	[46-ً�~���K*XT6\'�=���w����z`qi�]��d�	�`��z��^��j���)�a��2}�D	����h��@k��M�����;�{�Q2��כ��7���������א�b�U�xA���/	O\mX'��"������V����`[�d咗�G�d������{��b9���p4PS��"���I|x�^*y�$�vqS���훥�z)l�Rh�R��S(���(��֨�Ʀ��L/u�I�Pz��)p�8����������V,J�S8�F�en�E�zs�C�/��|C�ʱ'@b}�J�˫>�<:a�q`�r	�.�m*��wC��]hQ��h�[�6,��@+|��CQ�)-�#i��#\��$1��ϧ��xYqUğ�Of0��{��re����0-<2��i*%h4�85�M�`I`J�`i��8���ݝ�b������=�y������qn����X$�1��g�V�"��N�= ��lEe��g\cU�<���l!���z^�+�Xy�tR&����#�,L�N��'!F_L�� ur�z��9<��|��<�ʊb�7�OL�R�}��H}R���h	E+
=����)8:�L�F�;�/��H>�g�j�S~�m��ZL���0�s�� !)ѡ�,I�3Y?_� Û��̕'�Yz�E8��0ᤒq�8�q�����C���3I8�e�\��Xg"��G�"�Cee�M�5�%C�%��BHR8�A�����$�
��WK?�,	���+���l�/,�`Y���Z�4Y�E�1\�£M�0%�$�e�G�7(:��;�V����3�⁰{�4�q��UuT_�0s��D�n]Y$���q�`2b�v��x�O�������
��A�W������Q#b|_z����Ӹ�U�/$���͔`�H�YR��@�W:��%y�r_@
S�@����y�/��x�<��E��[�S;g����Rf����:�J��wpg�	���4�S̅v��y�hWH:��FW����&mP�p@��]"Y�#M0۽�x��U�[�=�zG�;_�A����ƍ�9+�,]sl�U�[�M���f��6~Ǟս��W쨿�_+ұ��j����۬bf/�0�QV�O��ul'�i]�&��$�@E�N�ǹX�[�،���8��O5u@IŅ��)���'�~F�8�0$�H��cOd~P@�8F��3�(?ƥ��=�ç'��å��g�
�8G�I�a����D�=$]Mgp�?��z����2�	okǢ@�0}æ�z����0�{9ѐ��F[��Dc[+fF)���<�����
�>�^ՉOB*tf����:�Z��v�Q���p�1�E�Oa{�UN��u�]�Q���+�xr�w͏�Z��m�˥�;b]�3��ſF�&z3M9��o�IQ�����(��z���@�sbu��]i�ޕz&Ÿ�s���(I��sAj�
?��q���C&�����3��i0�����.r���~���yX�c`������fS��W�`�D ���؛ˣ|��0�يI:�J��������S�������sq�Ŕcu򕲜��L	�jŖ�UC�1m���Z6O �%7�$�n�K�@MR�/�X��1nƅ����7oLH�R�qH�~e�t��[
p.h��O76��J��
/�T�[~��Z�EM!?y�~��>Vl��|m)�+F��j��V����&��Z1Q���*���_|��z��=s�XW�����K�? ����O�_�٭�4:a��R����p���r���
�γt�Sg�qb�
N<W/����4�/�\ct!�Y&���=@���~�\LU��Il��y���Ž%���
񳧜��
Yډ��J�s-pyɇCpkἲ"s��{�z>a���,x���$|~ce'RS@h�a/Q�z�:������
]%o�g�nW��[W�fI���\+����2��b���'�HF��$M��b3j�څr��$)d����0�E˾u�\����3E*i/C����!���
T�p�FJk$W*��$�Z�aV-X7�B�y��bJI�]@��]ڹS<����k��ͯ�,SJ�?X�0	՗���N�+["���ط�5n��,�MX�v�^	���2�z�֠(�Ar<��1^���jPՙ�$.E��J"Z���	=�Wښ����9��e��`���8{���K��W��{|����������
����p�T�����L�=��#���z̫P������\2퇵��\r��#b�R�R�8%�0����ʇ}#q/�T�K�t�[y�d ����0<�RX.,E� �����ZɶS�1�̑�����c]���ʭ�TN2Uk�*�Qz����,�Q%�c*%�A߮�������D1���
�� s�
y#b<��|�K�{BVVc�\�Gb�S��&��vO��O'4>8���bqΏ����N?:t�L{a�Y�+��l������(��OV��RÕ�«E��3�
n	شk�>on�;��I�s;�?;Ƚ���p
�A
)iW�����G�k�R��ʞٳ�
�\]�����4d���M9��Е�ġ�1�Qc&`~c�ފ��J<z2�"��c�jR�*I>c1Q�&��iǽ�F"��h���dBs�ZUF���U� �����J�fYq��ވ��D<���Zm�A;C_�d��SVڑ�3�=�7�1�HX�~���!~���7��?9.co�^}���f{���8 �EO.~�n�����~��/S��C:���Cҿ8�M�	�CV*���B�����5��	����!�%X��(�_W9�R�<C���������׋�^=�4����u�����l{�O(��W3D�1��~U��²3ñ��{b'K �'�v�%��e���f�u�%d]�ҽë��r���U6��E7h�ۜ��
B7цDt*���iڙ_n��
.ד}7��Tw��JVNl����V��UA�#ƭ������ᏽ�PZF�J��,@�6����0�m{lU@q�uC�%L>����/�Dέ���7ݟ
�>r9�R�<��js�FS�/|־)�KV�D����^�D!�4f�qW����W�mp�wv���J#�T�����ػ���5 [~�0��s�Pm
�}��-ϭ�iKIK>��[{���
hpE:\�mt�<���'��P���r�x���.����)r��~x4\?lݖ]@��at���L�,`ɻ�������z���eZ!�ez�`�Rw�
A^Wq� Ȳ�ք>�}�\�1�Kuk�w,�Lб�!%#���n&�%���?�{@3���sa� ���fB# �^e6�kn�FN�!�s���?`����^�*�z�Îl�
�v�ݝ��ć���,��%��XAu��V8]I�܃^c땛�k�H���@d�߱U��ȹ�J�g��=@X��Z>u >}�£����jM�x���K;�����W;�7���+� C0��ĕӄT�(�A��"�K���<�΅� �Np�FҮ�㴗�I
��ߪ3��7A[ȥ�2r[� �`��@$���+��4��w<VP��`��ߤl8r$�?2��|�zx��͔������K':ʵ��Z�	1u�E/B
=���p���vx�h�e��IM��y�0*vWSe��q����*����_?Uc �.�i.C��q�\V��5����t��_�7�Ç?��K�$pg��Uo5 ���`���36�s�Yk��F+4k��J�@Y+(+�:i���� ��z+<����+6X���8>Ai�?�ަ�T���
HUipX�L�IW�ɸ"��t��6=�âS��6��P�\zb���H��X���&�5��4�m7��}&T�ƞq��Z��ZP����Oz�&�Sx�ٝ��y��z�E�2��Ce�]h'�Qx_(��^2�R8�bJ�iI��d�m�}��>|�N��o�R������,xt3�P����B�2IA�h��a��`�F�wŋ� r�p���5bE�`B�e�J	W�o6bN�>�ak�P/�{��r#����}�a#�7�&>�!���<W�T����WuC��%Ǐ��;�+%J~�˧��
�;�'?�J]v��N���.��o��b̋�d6SѲ��'��j�Nn��U\'i��Nś�'`2i3ʃ�$6!K'�v��(Nə��7����7�}�a��t��5�Т�Mwa�&
�$/s�޾t&}^s��}������/�Q�)�=�;�i�N��B�1K��J����Q.*S���3 ��k���	�?/8ԉ�G����#:�S���23$��IB��3$�}kD��7X��Z��ܛu�x3�ipb��4��j��S�\��=X��{( s,�Y���I�T�4�e������jIK-���|/	'
������R�I/����Q�� #���
Pu����^��H�Y��ݶX^�#���Q�&G��hg��kB8ʱ�����c$��R0#2|�!�c�a�Ƒ� ���Qo��Pu)@�+���=��E� �؁9��#��eW��K.�|��4(bGg/��Hl�Z �H��������H#NbK�(_�O�z�!<�(��8�W#0�5�9ɘ��
ͨp�!	��u��G�)[OM�7�kD|�Z�i��n���Ϗ�8jV#V�@��8�X��+?���9s��@��ҳ�󋻏}3g�nz��:���5���p�ɦ�yqk�ف-�_ڸ�t����e����گ��2�L�68���-3�dz=�`�ԋ���n�z-ğ)����}e)�0�,�l�ɲÍ+�؞������u�y��-SJ2
�_�B/�g� �J�L�8�g�n��o]��˩7�pT��u���zD��m����h�6֨\��}/^�d�b���m�Al~�aպ�o�z���*M�'�J����[�#w��%\�5Z=��8&���7KًrU:����Fx�m�u%s����btHC�@�tv���;ձ�"ik-�1�9�ܿTo�s%��!��7I�Zu��Ҽ%?����\��#%?zV����w~�o�����i�C�����ooR�^�C�0���*���3w_>k��*^��dX�Ю2lJ�6�����f ?f�n��am��v�MW�]�4�Vr1��<a.��(�]��%�E?�觑ɹ?.�?�J%|���
lJKBQ%����EMyp"�D���f+Ӭd� ���A�P�Y�5��lM�a4�<[�B}䋳s`l���x���W��X���2'�Vh�
���q���WK-S��q��� #O���A0H�V����|� �bz��A-��\kW�F3؉�(�.sn�J�����+�
�A��Xt�	cdYO�qD�jG����
+�U?�A
�S��9��y�Ώ�j���.n��i�_����x�340031Q(HLO��*�`P�/bv���>��s,K�)3  �a���x��]�r�F���O1f����/Q���J9rR������]�T���  %1ZV�k���\�� `$dI_�RJ&����uOi�F\�� m��	_Fa��u�=rK��yJSF6d�KҎ�
ܩn�%��	��x��l������>_���=_�?|\1?��-�¥��]����%��.��u0
o�%%�y<-��p7����8[��m�Q_�����n7��~D����{Ix�S�ΉGS��M�+g��Kh'r����.�1i�9\�e��{І��`
� B��*"��'.Oy��W��b�H��=2] �G� &�+��+F�)='I�Rk�7axɃ9�����0����^�%|�8!iH�1��br��m>�1�
��V�H�(9��cx��{K֧�#9c�Ӥ�dA�`��9����l��i�S�K"��:�]���dm"(K:S� �2�]�,f	n ��[����D��#̎�'�{0�P,����>.G�
�x+7%o`CH�w�my�,f̧���H�֔�/h���-�
�I¾T�%�<]�g�I֌����&b1H��H1���Yy�d"4�|�R�:�܌|�����w4A�V�i�JQ�b����U�#.H{*�MW\�6e�b��%%g�eI��ȋ���:Df��9�	���H��h0PM|	D�FL@�\�[	l-Y��Y�G����`��&�4q|�Up���a�����!���%�>{#��..�/ 0j$�#e��	��$`׊�Rz���'���zv���P��r�`�<{�s:��i ���4O]�,I�K}�IC̐�.�גވ�	&�!���|`Z�
	��k�)An�
$b���2
#1�2�r4�,HVR�� `��8��s�k�~W\ 9�+0�>��Xh���>�6��9���QP�K��z�]�sY��"�E�������r��0��5�x'��g�$�|�@# 7�`��Z��}0� ���Z'��
0��X0:�S��@uۅ2`��������9�7i�z���~8;?�'�s���_���\H�o'ZdS�I1�f��E�e�u�A�3�Vh[�Oa��Lݼ݊��:�W��'R��/hp)%}�Bz��)y�Ͽ�c	��h�A�=���$d�NE�WI	�z�r�s�t�����<sF2�d�V8}ah�}��{�i�a�W�٨�fo����'o�i��D3��ၕb���όI�=�]P�)9�h�sz�b���#��2˾�B��s2���F���(X�
�PL�+!�،�|0x�@)��d1
i�u���RJ?�9��+���d6�~u�.��4w-���m��>P�|�*������m��0������/
Q4oE"�l�b�oKM�޷�/��+&�������uN���=UK�o;�,m}8V8����^^�.�e���A�]i���M� @�v���Ԯ�&y9G��u�&�v�o�&��~B:K��~��C���$���\5u��T�Sz:����ˆfՋ�4>�Q�= ��OCo�Kҵ�z!8At#����{�x�Fۡ�	˷X^�>].*�
ٯj�)ߠ	�����@���N��)R(�� /�7�g���r���_�ϲ�$��̜��w�%� ��N��(9"0�ޚ�!���j	8�t��&�	�6����E�С�w��5���DZ��!��MK��Es�n���-�
lƘ�yG�b��W.@��)>m�B˘�u>I`�
4�Ѓ0�\j�jz�r2�zvnI�׫Y���$��o�Q
e�䭛=r0�����U���ښ�����2m�⢩����zQ̮PF�{�ցl}��^�=�o#�F�2F;��&5�hVja��;f`�p�"&�q�{Io�4�\}G�G��W�XE�x&RrD$�K{�9&]_�*=��sIW��i�n�=�S��ng= ǜ���~ف��<�7�"��:w���1ʫV�.i�tJ�� ��Tn/ T��s���%�����D�νIoo� �G՘��s�zl$��	y΍O �z��q��at��h ���v{�78�^��9"��,������`p�p��~�>�ٍ��!Bʖ�H(�c�"+>[���Sm����H_��g	 C4F��i��e7�3���:���s�w˩3�m��?2���ۊS�<=�/F��#}z1�?��xv��b�C}����� 6Q�!5h�Eԝg��hMD�4� f���$��u��-}�z��q��`�UJ+�6Ĕ�����6�Qe��*�7��36�s2]�iTZ		Pa�rr+��
;�le����\�ɏ_
S�_H*K�n�����υU����-y!S�
`�㈍��w5"t��b���
��B59{�:���A�@5��bxPh���ho4�f����"��kU6Z�%!���5�9��I� _���آ��]|�y�B�r��4�>~��=��÷�1��d��2�E6���U�0��R#
��:W�uBДM'}�3�餯�sј�Ii�s�in�.�S��^�4]�aՠ�K��,�FW�ZW����/�~�u*�e�h�_匹�$�.�ӑ��z�B�,�)�oJL�?�{�4�� ����2,̈́\��� �����CH�E�F�Y���1���0�p����B�\�d�Z�G�S�hyl�{��,��m�<F�7��g�	+�v��}"��l0ώP/���$�\�ޱDl���/�/�5� ������]�������j;i��vFc0�d��)$ ��ӂ���/Ghf�(1�gN���ߊG�ӺM�د�ل���������@Y�Ц��/�do�g��H�8Bk(.2�n&%��	@\��Lr V�.Ť�6�ߋG��NI�����cɴ9�8m���^Tj<��:����Rk�S�J;�Χ�-{�w��O�p��9|���#���E�H%��e�b���z�0
VW?H�j�e�ZU����H;�)��+����iErsZ�N���8�좂�c��o?��Ƚ�NԞ`&�>i	�-D�u݋l/��E���l0{6��-�7�깾Mdv�G� ���2�O�>k�ϴ��یyݥ��n��K4��bx��UL��_�N�y�'X��G�S�=Q�<�X��2}FPSĜͣ��Ͽ$��RØ�,�C�h�Ξ �Q�2@/}pS�K���@�7
ۋ�Y���CQf��I?�bk#�������ω���M.{��*�=��0����mb=��Ć�jP=@P�O�(B�Bk�maD	!z�?w	"T��k@�Mi���;�g��0�T��<����C"2�p�2�U�N�lœ�47I6�s��0�3h���\Ư�wL�)�Z��o�D�)��3/b6+Ic^�R����ͤ���\����I+1� �������G3P�V�?w�=���#�,;-N�N�Z�-�X��^��Q�	����$�#��Ũ>��fu��=��6©�.���2�~ʐ]�rp��ҋc1�\U��W��C��5,�E$�`�����d0<����{�e���v���'�
z������v��-6��1��1�l�vx�ֽ\��E΀��|�V�_�<�<����F�>q��,�Lu�
�p��\��-��-c,X�S��xi��LT�_�W�i�x��jzN��+��Z��r*
�~�*�:�+U��d�j0�-�,tEsE��Av�j�m&��ЄB'@!��O4i}Ky�⢆Z��%�k�����>�'��yq��ֽ|z�kz�f)9��Ҙt����V&&�	\է�Aav����# =Եl4hPI�$*�G����3,k� ��\��4"(��Ww=�I�.6��O�S�;���I��֭y�Ғ�x�V���rBQ�����U�Pu�U�Ăԭ]�s��҆Tv�����h9I�v�ع
�	����noE�����U������V�(1����'�8�b0��ʹ�� K���T6YnL�����G6$�?���"��y����v4*[q���f��Ʉ�l�\�q@aa�|�xF�_�=\�լ��H���k�٨��~��
������Ȟ�����]	��A���� ]:�,j�<� �
v��n��R�u���X�JЂ�H)d�ؐUED>#SL�=dUR�
����86)�ʱ��8�x 2�8"��=�B��k*������`�y
��`�3[5����xY��������>�3���N[<��D�t�����*��S���큔 �c�#F���1S1�s���J5��%�
�1xRB:q�[��өxc�:(���G�X<H,�� �q�axw'a�D�x³��ׇ��|B���)�ʌ&� ������,*�e���.���TƣERUL2�^�U<�%g����cN<E.=mp� ��y�a�}53���,�(���qw�$:[�t�h���e��d�v��N��ᇨ�~�u*ߓA���j�NV~�_�=�*�������
M�J�9��U��������VUe�Ê�~Q[T��0k��MR����|������s[>�z�I�?:g�k�k�C�<+g���ST�4��݋�>�h�v|u����b��2&7m���@�_�����:��Bb��{�����Ꝛ�UX]��r>����3�*��S�\�-Qw,x��
��a��J+�eISg���>OmQ�]�?G�
��R�,CTbk���.���0�	�VjZ�����&��O�H��a��J*d)*�E�a��ȵZ��~�8bx��<?$>Q���E`_S"[IX��T�b��x���ޤ�>��2D��ŏYn)ѽO�s[ 补 J)��	 #���X��b�û��ճ������%����S]},O^�<fi����NY)����z4+f���b7�tp���E؎,בr����@,�ڮ�WBLn�o�1��U�z/���X��s3	��c��WzM�xW�1 kq*�\6�h�R��/�,���� �j`�����X�(�q&��G:��~C�*~�2RK�_YL 2����V"!�`�Æ20�W6���N2iY�
+OO��]��?��Û�5%��Z3,%Hf5��*�ߠY�����HV��XR���ɖj�߃�\��lA�ɂ<L���1ɕ�,Ƌ�v�S������d�i��OD4���0�}���r�_�� d-�^��`(r��PA;�J�^!J��=u�~��?�4f{l�x�;|���!�	�6�MK  ,�ȡx�31 ���Լ��l��W����'�b�$����� �k
�x�340031Q(HLO��*�`�,�D�\Sޡ#�>ۗ�-�1 �ޤx�340031Q(HLO��*�`�/���m��R��潷�g��	�  ��
S��#x�uY[o�u����֫�J\I�J\aIJ3�ɺ�.+�ԅ��H/����nMw�L��]��nRE?��@blFF��~��N��^l~���0��%��w��g��P���t�:��|���������p��`M�b6��T�M5�؍�!z��T�'"�ͧ_9��^ye������1�����/c2|��͎��\���{�@űЁ`K�!#��Ҕ�-N�}�lj!"�B?�1Y�2d�����]�𽗳�؅&��B�lS�m�YSE�T��ˤ�B�V;o�I�D�))�����4�"�Y���}l.	��<M#@�0�������
��Zd��mO�"�w��^���s]D&�n%B��d�/^�{���䓴�̈́�̿~ٜ�{�+J�աC-�6����@˔�9���H��y��b-�,V��	�H8iU�&هm�Y1Z�E�u�}t&� * rs���s^3R�Y
�ע�;�n����$���	֋�sd�
/x���;��zC!x[]�C�F<Ƿ1�`����"�<�D��ri�fm����~Tk.����m��"7����j��n���H��Kk��5cc+Bg*����a�h�$t��DҒ��Z��-�s	�^�q����?4&z/
%��=�k�d҉&�!�����W�H��K��5L�G:%�DRdc����\��}�0Vcc��"��j�|��,�^-y��M=,b�0�D792�Aac�@�'�i��˴�������Sf����ڭ̷#%��2ޥܵ²��ے�����i[�~�g(B�Ґ��
4oZp�|Z{$�Ҽ(4�D�ԓH˼�)�u�o�K�uK�"tc�-uX�����Q�(����e^��L�!�H	��G6�8u�� ��\3lﭮ� Q�^��>�"�A� ���.XG��!�"R��y� ���:5<!�R�h�[�Z�p;gE�*mݸ!���E���Q�.��B��� ��Z���������nK��³찃y"6q��H-X������Y�b���� V@�վ,=�,b�'�,�X��GH�W�f5�Х[P�*�m�ju����%)�K���uh��^Q2�x��QT؜V���>\i�RRa���>2W����ĕ o!9����@|~};>��]� [2���6�
���|7t.���!ϓ]�Y�C��Y*Iœ�F��{��L����r��\�r��XN�۰��;j�+�M��P�"�ҲR[;�S )A�m�� �ܦ��ի���^ ǫ��i:��砭����*�j"�}����� %|BL�op�h\b�,���#�.:�@�y/�����y�fShjmR��l
,���N�����E�հ)�M��'H�I�%�b�*�9DeDT�^c�I�;�� ��E�=�F�Q��X��|gy��mo)��:	�{ �`o\��TD9�I7e�<�j0y�q��U"���H�l5G�Vl�Kbѝ����0��Fd�8������-)�����rw0|V��~{W�x9�β>��d�ː%��kv��j�k�W�?���b%�m^mGA�o�Qp�4����E�^���f��ב s�W�ĮB��e�k�t%&��Y�V�=�ٌ���3��t��4z=\RK���\`3>pu;��1�&]��yS	
���PٹQb	�m�fN�M��e
_m��k�U�L�'�I�l�l
���<��Q�ol��9��B+2�D���;߽׏Y/d%�*�oUaG�!��[��� �>�jXr�H���y��lu�0���F�d+]Pe��&ɻפR�U0�E,Q}�BY��FfE��x!��v��[�/#b�n�Ųy�t)� ]����M�$��E�7y�ǌb�}�+{4EӮ��l�4h@��u�c'	�D
�v�'��Z�H[��r�4���ԙ���s^5$$�nVd��U�2���W�}�� �]�hT�)������#;]&���h:������_����LOO3��Y������k�;���#�8w���uѱOW`��ռ�k�#vlyNuN��ǑԝLzΪ�-_��sU�Y{S!���P*#d����J
�n�ψhe���
�
C�c$������	Z��(u+��c�Q7qR��g��_'�nQ��*wX��T�!��}~�P;md��Ρ���]��$�M�-	���:�wY�=T��-:W���HӻJ�hC.�m�g�c���yu�}Ί���>]������c(�Fn��RZړ��V'a���$��A�l=A.���N1���B��<�"���iAm��u��zI�(�-��P	�
�����-�	9�r�����8}k:5��@`�T+z�����q�&��*}���X��ʾ�۪������~8��f�'H�8�myݫ@�{'�ٚ���ښ�`7�
�l~w�E
+�/UǺ��	�:ڱBu��a`4�b*��8 kB�'�
�Y����~ҪT��eM�qcR�c���@�@FѴ����7E�R%�4Xfx��y��I��>�Z�Z+M��>/>"��R�.#��H�z�{Z��.y��ڎ��k�*�^�B�
���,ځ��E�D�Qm��.��_DQ�(���3�YQ����vm��V��oez�:���mj[K.C�mI[f����+�vi����þ�5״��t �*r��o򶩹��l�@��h���D��-?�Y�R�e�EX��E��,����m <[��nAW|�L��.�@��f�ɵ�9�H�� ��JH�Td{�����ghw���<%�H��$��r��$ �i�����}ܫ�{*<5�U����ڤM񖭧���5$�%Q���������H��O���8R-ܵ������KMݏx�>aA��Ձع�
;[J��nһ�䓅��m|3�@_��0T��i2��q�. z����H�O2�|i^A�Pa����	DH���Aن�e�뜊'}�kG;�tf���<
z����S��љ���2Ư#k
�]�e��Y�i�FT^��HFڔ�^/���\K�V�X�|�Ķ�����
�8�X�Fn��*�����Vp�`w��=����~��8���2wK�@ө�&�/*�Ѣl�ߥ��1�*���҄�tW�\W(�^�V�At}��� �dk=�V�

�Wy�R��T���d���ɖ?��t���
���$6p	b���$�%x-X/��ɡOn
�@h��&G;E�L]�Y� F+���{n�3��9t`}Gݏ� �dI�p�-6^�B��kS��Y�ٯ����3?|}�|���^����g�
����"�O�2�*�:�:��~���ӿ�s�-�CZ�Ӥ�	�G-��z �(��2ߺ�ܼ<d��c�oF����ŭ�X�?=yԼ;{��fv�|~k�����?o����C@���~����#�/2?���}��$���a�S�����lϘ=�n������F���m�/��r�6����T{�~;5b~s�Hw�љYdǳ�f�w�NO��>a�:/r5z�v\�
	��~�ꡋ���{I��Z�j�K�O���Ua��_9NޜJ��܅��O�yn��d��y��������o.�:g~:~��G�s�f��A��;C����Oo9�|�B����Edl��h���ԋ!��3��3t:2Ko�O�~�̎�m�db����W�9o��`�#s�������_��[g��Wk�/�\4j��]��/���-�L�ƽ����_��_�]�I�r�f��?n~��a���g���L1�V̿^|ü}�Y;����ï�_�[0�FG̷�
�k�F�C�7�s��������F?3/n�/'�_/�2���>��n�<i�|�u���C_��m 跧OgLL����+�-[��'n�W#�� �R���V�=/�ӳ���o�C��,�W�ߧG���7�Z>d?�����sc�~��$�Xm���q3�2l
O�Ao��ѽ�$�~�����/�s矿���z���_�J���9��q��`*����C/�K�<l��x��[	<Tmۿg3�}'&[(;5��"D��b��$K)�J��l-�I�(K��e��JZD��-dI�}�3=�o_o=��|�������9纯������}��t�� ��= �  8��o ܐkJJ����@�)
��@��A������[!��a�,�f�}
4G$���p`���x����}J��Ca�7�αe�f��v��fm%�]755�fddP�\�򿘞�Nuvv��~h�v��劉�Q{{{��bzz�������m���v����G���;|Ξ�������ٶ��Q�d��3ש�W������/��O�o�(�z��-juu�=�����/����2UWW�k��+�
?��?>~>Ə���w��IB�(N��t���Z!$"�%q�ڢ�g~5�B��8�r�}�Ь��Ba<�����%�ڊ������l�-�{��p�����l����W���_�`����s�`���������:��S��|���'�i�j��O��.��ȗ�������pjhh�w�ȑ#T���2���ŗ������Ǽ�[`aa�{�_��^�p�������}��_i��Yߖ_k/�Ç�����uѢE��h���������k��5DFF~k?�}7�������_mN��������������������{�a�l|�
m,~	�=��W����o����������i}����{|������O��񘙙�!���r����Ɵ�������c����ď��w���9i�}�#W��]�F������6GڷN�o|��WUU�kߘ/���/
B෹����=��q>7���Ϝ��Ϝ~��Ϛ����?��g�_���??ş������6	QB�>Z'����d�uk���
�cGg��]3�}���������N]~�������4��2�hH!��;N+K���7���/��)�͖��_�N��4�tJ��_��6oC8�h��̬ϟ���#L�u��Y
?�=�O�>G����Nk�����9f���Ka͟2���!�����4M_˱y6��~�M����Ư1��ig���}�����A|�����mN��{|����y�n���iff��k�m���`���.""B�����~ŏ����{���#��u�VW�?�G1w����}�~,K}���/�N[o700��1P�������g���G����%��aO�s��n��������p�e�s������R~JDDďj��j��	�{�?
�~m��'�ϭq�p<<<����ҿ}����>7~J?�?Oi���/��������x����s�����{����ϑ�����M��'�姜[���1@��ӟ��s�{-�����ߋ�� ^~̹�
?r�����x������<�7ϟ�����?0��?�?s��-�4���x9�O�~i��q<���r��?�����W�R'''e���/�￼
TTT������~B��}����_u���+���w^����~Nm�௲�3{0���9����>mO��?��si_��y��cH�_~@���)hg/h�X������9��9̭��rҹ�3��3sks��_���?���������G�L�Y����?Y

t�i��id�e>����~y�� �"��Ոߺ�pۚ5�@���oFB
D��sWP���ot�� �B��:�>�^;�,��Sn�v��8�Z��w��H2V�DUV�ݓu�)
Sy��\(�I�c��4�J�'U^��z* ��^�ǁ�~-�&���P���؝c��Go�>�|zڪ�׿�4�}iurh��F���NDb���3�����	
љ�|��G`&��@>���{+ل�J�r\ڿ�_�_:�����M��Ţc��c1#^��
��H�ρ��v��О
{]�V��Ͻ����U��ʥ��3C~Ĥ)���ۏ�_��.N��
\Ǟ��e�v���W!��"��0N�YfD|9��OF�k�I	Pb�
�1ݠ�]]�.Fa��j�r���O[�HO˂5A��?���;p�Y���s�I2��(�W~��
�: �%X
��[o%3Q��V�h�(T豆[�,���� �/�3œ�2V��a���a	�K�X&y)w.^��L�����B'b����AR&=4�Dl��
='���W�C����RJP'�A	����v��,R�S�"�����ix<��+�I���6EO�d�E�ج��7��f�3-���J*uILp䥄q�� �̅��tԐ�0O���UG'���D�o�{mL��^���͚S*3F%�����D�P�q#�n�&��?Ai���l[���Q��0݃�MJ�"Ga�b��'����T����-�U������6�[��j:*jA3O#�cD��u��=�C���I@�1��O�au�U��ځ2(O��?w]�����B�e��U�Ù�jT�WS�)uo�қZR,��T�nӿe��-�+d�Ms:í���R�^_J�mۧ�%��Ɏ_?��B;�(z�QP"uZ�첹��)�z��ʄgu�{�d��wv�Eƻ(Z%�Z��P��Q#�^�j�+^�D����ڗc�e�a"�*p��L�����Q��6�̸A^;�P[�b�%+~q�f��j{t¾�g0�P�z'tYR�A�z7%�]�
��,j�40���<s�w�/��V�0�����Q�M��c>��SK붽^��/&Ml^�!�&:��������R�>Mr&7���֐��g�]��W�6r��{�eҸ��-�a��P�F�9�����B���ɗ8���q�v�W��^�؛C0��ʢ�����z���g��Hٳ9
�G�k�)!x���ο���ڋثb��C.T�Q!H��Х�tƪ�Nt����Jp��Н��B�2`���#�-�K5���\
%^�xx�雮��vsJ Hǣ g]A�*YO���}Q�,��Ĺ�a��E��s�$�1�"�y��ɽ�#\3;Y�ei�$Z���CeH�=�k{{� f����ⅺT��7�}��@Ra�L/�Qbt��>��%�hO��r�t��,d�ء2�qǑ���UL�6
�qũ����T�*E9Nh3���e��I����p�a��%V��+;2B�qI� ����d��n8�ΑX�#��I
4�ޮ�n ��M~�-��	� �V��vD\r+�4���)��C�x�1!�FP(���o�Xⵌ�6;{�t�.i�ڣ�X��^{FAm\���70ܗǨ���N��`�UΡC�v�s�=��p3��eH|u�E�91�?�u�X�J�U��}�G�68[lVF��M��[��J
%��F�k�Zݟ������_���y.��ø:�P���d�P_��������(Չ	E)s�BIBw�t5��yx�k�r7;�6c������γ*\[���TK�=�E��<��J~�|c~��+���&Q"5��,��n���y*ƭ'z^]�?j@_����WgUqWc�>��g�Y�����N7��8Ն��\�͂��E��EZ�]�+�'vh�jXJfh&7
�;�c���Z��m�dc�ZO����ʧ.#��>u���qL��ԍ����|MATA�}�˫R*��\��{�|�)���U���j���Ӻ���͘"�3���C���d���}Mv)SS��-y��0�}�����:m�"E�1	%�t���;��GU��k.O�A�b�N_���"O��E��]��"Z_��<�,o߻ץ��.����,�y9�ɠ� �d���ZT��nh�tg�`��B�אyj��Q;*�w�~��֌��sHޥZ�hw��}w��8���ݟ�8�Gߛ�<�V����N_�uVrL�����3��W]�n1��|o��=�G�e�'�;�M�mug�[:�f,8���p�ѧ���1L��6��Ď/�m�M�4R�&7�������Mg�����7ZU���U�+T��Vj�8��&��TiBY��uZld�F]���'��I���eg4j�"�s�C�1���Ly�kR!�b�H��>�|r���ZHB9I�5F������-�.�fKpXj%׹�'�	7ݴ�l����Qȣ�Ui����;�j^u��5-�L��qx�_ԑ�d������:�����U���#���k{0o��û���]� G0
4�3t��`B��2�h�ߴ4M�{j-����OMb;|G!��޻��kɋ��c)S/-�J4/qcI���N
<�^�}~�w������Qi.F��g��tm|٫���\��� ���
z.u�'�M���^��#��F[��"|S 3�5ȟ���8�5a;<��\�t9�,�j��j6���m�.뢩
�W�V$O�@��"��lcH��qgk�;9.Hk�*�;Iv�'�G
����ąV�/#��>���~�	��Ѯ��=|�֓v3O��lU`i9i�;��G��y�;[����0�
j���&'|)��!w���/Q!�Q)�O��*��<O盂����U���=���4?��g�v���t_~w9���d�5��͹q`�mn���Mew����zS��Q^;Ei��ƶ��{{]-�d��6�əVsB��qcO�:�B/�TO�5d�=��җ����g�`��)2��I�T���HO���Į��������UN��|�	�ط�o�TK>f%/I��$�1����=:�Z����c�v�큮�Ǧ�9�,�ݏCj@�آwz��#U��t�e����x����|�uޚz�;A�	����;Z��@y��|4�5i�?\ͻ�w�S�����,[`Ө��%R�X�
�Ju6^���LMe�I:��;O�L�%��!���]��}of�OGX��*-�gQV�S)ʪ�>m�$s�:X��1|"i9R�����7]�����XkB9�5�^D�]&/\[��u��n���m���M�r�c��%��B���	��T��!"���4M�����~�;��<��P2*�h/���e�A��;��kb6�&j�p̞��$�)r�X	��tNnh�m����h�Y&N0^z.���ֵ(��v_��Fy����>���l!#�)���k[z��Ǜ�)��,3�\3�,U�m��<��o�e>��k��L��b�
�%㳹��]W�+�-����C\��Jf���:�\�WM�� r�x�L�1�pÙ���+ͧN䝱t�U���p�z����<;*h��G�/Xq���wk�M��h�Ǐ���u�,��C��Pѱ�i�O�U�Ru����7���[�/�~�z�d�R��^��Xu�\mf�.D�%_�]N�Z0]qb���ea�Ą��&>������HAefWk|=<�"�l~��e'�&&�)���e������<9��qա�����u-F��'6S��F�&K����Gzy*��x���l�y�1�����FG�S���>@J����FI��1ɛ1Z@�������"�=������[�߸�IŞ��xD�G����OM(7��0�!�h�tpy�[�:��JV���ߥ�<5������������ۏE�RCw6�=/:ؼ����>�|͛��=�t�o�]�	��k�܊y�rv;\�s�ޭ���S��@����S���㞥:������<�vN�������V��r�;����O��(�5!�;W�ᦫU��B�A�ٷ�Η�A~ɍ��XMN(J��^�:����0~�88X
$�$�l�4�����x���LԠ�1+�����b97�*9A��7	�_^�W�W��)�>��"�BB�r�J{���� �����eVJ����'�6漙��
�{F"����C�͋6\�}73�fe�r��H�%�;j2Xc�v������{͵%6���!K�̭�U�t,שׁ��>�6Ԧط�x`o	g���s+W��oZe��B���D-�W?�[�	3V���T�z�X���H��gdC��rq�_8�ц�S���6vǏ-8�A��E�>�U����VJ��?&F��*��6F�1�t\ec-�N�����G#X��ʏklýN~(/ X��*ׂ����hd������L�����<��y�,׊�R~��f3�����[Ț�t.WA�f�3��4��|eir}���K���+R�du¡5:yR'/@5�η���r��s�iT.͝(�L���E7��𘬾k��;���l�����򑰴Ըs�M�α��&�渚T�>fv�p5S���R �2Μ����µ8�ۑ��;+h������Ǥ��u�N;���
Z���ۅ�Qwc�4G�[�\y�� ��������X���� �B�i���b��+H��z�)E�Q����A$��lU:��#�����q3��\���6-$ ��tv���
B���vᛐ!!p�-gH��~�L���+�C�-eV��r?+�:ѯ�6��*H��5��0w%@l�E��:�d��i�c1��h
�]����CL{����h���';@X>f��WQ��{�
�Ɯ��tv�o��<:���|0!�@;~*�kH�cl}�_<�>�B���`_�
������V� Z&l�9�=�F�Q>U���|�\oR���5�
�~WO�<^�O��3��i��L·�
WQ�jK@�p��h���CO�{�t�b��{�K��z��/z����AH@ag|"5��I��vZ�z�Y�4;z`�CAy|���
vi�~�_3!`} \��+[=^�N0�Mkx�L���^��3OÒ�4a+��`�5�9���'�-K�gS��O:
��WC�'Ձ�H�ўƀ�j�=�W�"{11��^�
ʐ�-LDQ׆OJu�|��7}}�
����'W�
U�9!�O"��F�QÞ}�I�[o\�躥MZ����B`�dE��aL۲�NY�F����t�Th���|�FX�(�%�_�u|����a�;�V�&a�Ǝ��5K�vM砱����a����ndl�q�����|6f7��g�qwRb=���32npб}d��w�X�w�555<R��FI�7@��Z��|ۜ�D��D5�nKX�ܙ��T�3���k"%����������K�\Jb�Q\�)�#��{ϟp���6�"ѡc8@&_+M��z���C9���L,Y�v�[�W�cJ`^���pX��%5���ha�g�d���,���k�7��0ps�ǒ0��P��c�7��
rS�8�"8�˪�u#��m�P��Ɂ�H���Q�P�5g�rI���K5�=8�Rv���gBb��DAk�Q�� �4����R�8B�MҸzK�Fݱ�jf?��X�L><����9��`>��#����\[e��7�	���
����L��=�(����u�@�_��[k��-�b��v�(x'���@9!w�m%]��}�ֈ����O�F�u��	���#�G�%��Y"ƅx5�KP�F;J���ҵ�t�=���rM�t\��AU����D�a�m
-<L[L��D7�6;�T�6R*�F�K� �?��{`��J������+p��oV��
�d�M����c]�G�g�]N����Yl#����-���Jx<x�}�����a��Hb��mn��6&�mN
i�")xe��vJJ�Sr�*MC��B8At�x:|��q�7!nz캼;b���.<����|�*�9��ʝ���ZD��X�e� 
h!p�ĠI���;����!V�Rr$�$Ұ�����˝_��f���df�F���VJ���N�AK��y5��C%�=�z�����;��d��3�9�T�����+��V����T��n��}�f�]X7/yM��0���v�Z�p��a�w=����I�nr+XǶ�`(�&���m�f��	�.�PvQ2��R���!'"�)Qs�k8dxd�d���|Hkv9����3z����kZxɏe�=��.0Dt	�O��A�C�{
��,%.�>T)��>v+�๔�aQL�Q��y�푴�*e1�\�g^����ۢK��_��("�d	����1E;��Rom{Qz���6|=*ɦk��>Y$S ?��t؋,
�T	B�CK�^�B�ՏN��R��⁺T�85+�_���II��:v/0�b��9�<!�Q��S��
Ӏ�}(%�X"Y��Jk�a�Z����3��� ��M�w.��v�Z�/⒦.h0��`�߂m�h�(v�gq:�R��*�8��XS�VI�� .����5rq�1p�Nz��o׋����*�j�B�#��̔��2y��]x�m���V0x���9�G�̥�(���.���Pu���9����1;79��T�i/�4X����(��SB�������"�pԸVDN6`�I���7οP��1l�}@Ed�q�?���,�Fp|9��}��ł�+����ұm&��#']kI�mp�x ���������k�;y�3��0`ڬ��ԋ7qƪ���%�FOKt���n,��ĨZ%�%�}�V�j]��|Kt�ǭHT�8<�<�Fq.�Ĩ) .�k���iT {���\X�4&7夅�vO6����M�H1��עP�C�[���-�k0�Vy�-,�m�q��~f��F~�cח�׷���
\Ձ����N5ۦ�n��H!0w%���5�� QY��H��"��=>��<�8��5y'���(��=��)�}$ի�⺮`k쥍���b���"���f�T�&'e&X���Ȉ{��ɟd܉ub(F�&&�{��$2A{*5��+XE�����=����hLQHQ�^Q�'��h�3w"�T��
� ҅B� e�]�zV��<����˛i��b?G	�:HU�6(�y{��<'tM���ۖ~�����&��7�? ����D}w�,ʉȭ��p�S8Ps�m/jhU�*G�p[8ر�l���Q�WK3> �G�v�l���{%H�Gl��q�Ϡ܊o�Q��'^�\�;��CCq�Y�8)��}���d0%H�Պ;[�?%��IᲛ�2s9�Yײl����� Y�%޵�\Me��P��L���C�&[��%�3SLJ�l�1�I�Y	ċ�v�;�J��A*�1�NZ�(']��UQB�1�E�ZR���P5yY�p�Gu������3����X�W6x�N�l�q�]����;�e�3q���"O�́���
1��o�d�:�p&�?bV��G��H�Y�xw�co�>�j)�$K�E-������e�:3���p�"���n��t"����¥)��z&��{���@�B�ٹ�n����v: ɧ�O%4屹���OC=݌�A���a�x�s��-�/*QP*I��)��KI..V��� oP4�+x�}�?O�0��|���@���KS	1��eD.�5Xr�Ⱦ �(���ߥKrz~���jZ��o	��DF��l����LM�^Iy�O���5�ƙ�ἶ��t�˼ֶD헕�A�*k<C!�h<�q� ~�),5�@,��H��F1ߕ�د�Chde��<g�ԴYq��]t����n2Mh�!�.q��8�_!�B"�ܶ	-�WN���	�W2�GB�C5�c���>^FJ:`���b3��7�m7�U�(-�д�=��F���$W�Lߝ�����YZ�w��c(�?�h�h�B��$���?����6T�����hG8�1�+
+�
=���Hۜ��i���:�S'�:���:�Ę�F&ު���ax��UmLSWN�(�|��C�kf�xm��Xt����c0g4�޶�p������R��}d[$�wY2���9�	��ͯ�uN���m�[�c�~��L�ν�ò������>��>�s����TLh��y��ie^#���,v�����A/^�|X�x|��{������`xh^���]4+}��y7ʉ�!�Պ�>���{�Ҡ1��ː�����,�[��f$`2��d�d1�d<�{1�{\'����'�E
�"�s4��(n2^����
�ˢC^����K�ђ���$P���{�4�J��Y����TxcM"pϨ k�J~7/אM��o
���{�\��"�������qzo^wQ��"�
R�p�������9
��Q?vؓ�j)�	,4�`�j<��:?�7�_�8x8mm#�ru��"ӄ�������YCIt����M��i�.T�iQ�dn���"�o��E^jr%�@9"/
�
,��ʷ GhdD<
v���}��"�I�*P�u�Ֆ����X�;I���"P�[��8���q$K^�
_�Ʉ7��D��J����g<؇�%*Xk_�'Q���;&3LK�1��4�<>��k$Y
9� c�i"��!�E�j�4P�I��s	���Ӓ�<�*E)�=����Z�����>b�d��$wX
��7�HibT�3��MI�p�Bz���������������F/�U�x��,F��Q)ω�#���
�,���y�m�VJ�Y1����!�+$Ɂ&603�h���6:�GUP]��[�<�N�9>������NPNvK��g�����V�-�`�ؚx"Z�<'ːR��noWf�g��
"n���Y�sL5�X�sg����\������B=�J!D��zOn�)��[J(B�^�Ԭ�	���
�OhY6�)���_��	��#E1�u�H,�i�����n=��L΂��M��(a����E�ܚ	�Kv8zYKλ���L�E�2��$�:�T42tQ;˧E��y6�]�̀�w�RM�B�fHMPZ2	�=G��F�,���ʺ=�F�7��'>�Δ��ޟJ(o�ԁe�<��N����w(G�oN��C�p5���`�N]��+��3����JA�peE)�}��k!�"I�Ӧ�9�\> L�J�Iv��R����~e�,���U�~�TR������g��A����e��z�,�I���
1j��0���؁��&̒�OX�����8ɐt�bB�)\z�6�\~�^C�jxAt�,Û	��a�Jn�;
F�L�~oV܊x�Y�H@�:�zx���u�@�:��O�F
'�똩Sa���F|t��]�<�=����ܳ�U��'���}	�)KL�=�t�~N:D�k�J�1��lD���
L��I#J�t>��-�Cn��ndĴ [:<���7�AQ�N��.��nU����U����Ԡ9�A$oK���ޡ��9��0eW�x�340031Q(HLO��*�`x��L����]Ooި�{�� �b��x��X�n����S��l�RjR�lǍ9X$[l��bo�AX�ȑ8k��������F_�O�o�gZq�^�����?P"ɤ��@�Ҟ���h���Y��^ss��'����L�Q��y�L��{�+�U$<?���q�K�R�'wE �|�f�{f���EL�!�iN�=��)�����:%���eQc�_��Qɺ���m�ʜ��f	A����	������cӐ+lZ8�|����GA��K���g���G,��i-�d�H��,��}C���6���%�"�</�2%G�(�<̽[H1��,ɠ~��.\�ҝ�4=�:�9t8��:��Z��������;��{���n�!��tCBA!��&��K
	�6-�'��3Ɏ`��E��yҾ�ʾ��u��?TA��s��]��tx��!

���Fi� �dB7")b�V` �3,r<l�85X�E�$����=���}*%�zQ=#r�(�Sd�P3��V����7!dZ��\q ��V�? ����߹%7F�i`��H���"��|/�~	A��,�d��y�Mux��{�)ܽL�o;x��s���[�R��]���΋.��t��q#��U�L�{�6`���ց}�"b�S	�?�t�iy��9�vh��D|ǳ����"�7p3J~��y�����ǔ�gFMZ )"�Q"S�NB���#d�I7aR0i�y�e����\͸"�ǅ��%�	PօJ��eÞ���<�e�
��ql��Jj`�h��)��3/(�Bd�z����?�ޮx��4>扔:2��F�R*cJ���.�)ܼ��[X@�{�fE�GU(ĚFߴ5��� ��*&%�S��E��c�h�o��X�T�����*�� �ߺ��Հ�toBq_W����n�آ��R\�Vw�6+6�O��{9^�:�[��O�wn�
d�Bx�כ?�����K�C7ܹؑF���J�:>����.������Ԇ���~9V��Q#'1Ӂ�>�b�s���w�D0���J���|y�`')Tѐ��66�=����m�g����W��3����?-)a[�>��]�.���GUH̗��亁�~�~�0��Cs<4Ͳ�BX�w����-�92^A������7�eG���ް�=��K$��p��y�����f:���9i@ձ�x��|�7�F�'�2����.�Z_}��˓�������:P�d˹R�9دd��6�o�_���C���f���;A�{��8�҇��~�Lѭ�I%� �}֚qya>K�*��ͤ����\�M�� 'U�L�SUrt�c�jR���ͤ��=���Aی�T��/"ܝZo0}<�;�hd��$�`7U����|����=�KX6J�s]U������n^s{"�<:��6a�m��.A����(�-9u��¡�vog3�@��=����(>bjߚ��\���mR&���G�M����G8ȸ��o
�]-]e�Ӻp�ؼ
f�+Y�����򮬼&e��?��b")�B�J��)2�v�#Y��b��Mo���B��~Lң�?r4wݱY����^5���v,��a�C��U���4�?4�f�z��:p^�*x'�'W ������1qÛߟP�vo��hM���#��鱖x=�«�y�*ny4l)_��DY��qp5?��(߱k�x��]�H���c�B�����n�Q�6��D���p��Ϫ�aU����1��Ge[2�֨ľw�
��a���h��B���4�&�9H�a�y�X�mg�,1��o��Oa���������~���x�340031QH�,JMJ,Nu��K�L��*fx��buH�\qڊ�_��zf�]Zk a���#x�u�AO�0����N� n���0$���Do]�uT�Z�������k��m�~�Ȕ,4: �-�F�!R
/d�\.
HH	�D)w��NAG[���3�7�a����y�Lġ2/5j؃̹H����P�ȍ�=YT3��S���o�����'�e�Vx9���e��ܶ
�Qf2#"7A�t�:�	�6o��.���V�� �cv#�����0��5��n���]�
eP�$y���Aq���p?����F��J�Ix��/HB����P8�!
0���-�6+��u���q�ھ&Ms-�� ������:�]�h�m뙧 EJ�I�x�M�1
�0�{�bi�^���/�\�'(��
b��0�(I�Gd��x�V��#.�$��QQY	�"|B�������g'Fi��ޟ��]���RM7�-M��.x��is�̲.�������q38{�-!H I t���q��~%�ݖݖ��v�^{���Ȩ̏������������=5����ow�,�����?_=8ed���
��_�3+r��Q�E.�K�h�ҩN�q.�rÊ�r���OW~��z��"����O%��
��^�'�Q](����W���9]}�a��o����1��[�^�o��Y�����������
<���W�|��|���� n�Զ�
ȳ�>�^��ל��>�N��}�}0������u���<+r�?3�<n�A~O�����w���n�_��M|��F|�	pB���es��+�b��k�Г��>���:��pzk/����-͓�����Oā����o��?�
N��ʠ>��V��A�ݶ�&��5��|2m͸�pS�ܵ��*��knbz׌�`�����:[�m�M�X���z����f��zlS-���������p����#T�6�E���������7�L�Mj�������E��ߘ߬,���Ѭ���䳘K���1��2�>i"1��)�ke�ߐ)�'��8���}[�����#~��
=#0��p��m�aR&��*( �X��
G�2��I�ߢH��na�|����C��P]�F''c�;w�0k�a؞�:qxNz�(ڿ�<}0��_�K�r~*�?C�
T�/r �$5� (��.�%�C'���_�Oi��~tw����G#~����4�C}i��#�;�P�6's���KzV�ܦ�2���H�a#�c@���u�Ⱦ��y��޵�o��,�O�n��q[�u��>}� �o� #�Y���T�+�'��݅���^ƚ
1ߎ���E�@�L���CQ��΍��n:��4�6�a�A���[����BBkE8��=ݮ���ƶ+l�U��U�����T�N���e��]��{w��<�;?�:���t�����-,g�����[��:��q!O�\�z�x�^�������q�W܈k�ܿ{�򛟅w%��}8<!�XVu�'o��G|��9�q������ 
V8���:�L+j��5d���Hv`ɥ�A:�Bv7�q����a`���N�I�1�;I��=����t(Ԃ��OΌq6%�{��6\~ `���Y:F}A�5� z��G������E�Tb��n]02��vz
��Ƥ6�� �$��[��N�:��sS�@e<���jC��dQ{Geږ���������T�^.y]É��߃�GX|Z�?�ed]K�3���O�=�rw��6�Ԓ��
��@��q���3��z](͆��`v蹾<,��{H�1Jz��s �(�
7 ���u����<ۨA�������/��g��TyO�mIL$n�,�j�-|��D��Boo�
GM��X�Cʦ�E��F���d��̭DA�Q��ۮ�lr��f0����2k�Iؗ���j
��@�;P�� }
� q�ݓ}��a���q+LFl���@��+�2����D��f`�9��P�崟�G3."&�H��ޫ������ۅ����=�Cz�9��My��	�~�惌��]�2�,V�. �0���+�,��F�e���`-:ޅBw��!�E��#��j<m_u}nZ�If'�ໍ�u�{^�ntr��r���g����Ɨ��|�_x��?�sw��6��Iܹ��C��p@�:���0��T&�97���<A9�E6�m�#փ���M]�$ӹ�I>�ƠJ�i�C=l2�x˗e��"��,����?�X�\�����]M���:(�g��(��auPk�9u�D�Z��hT&k�ET�7QA�~n��=����	���#�;|���#�y���.~�����n�U.:J.��ڳձ9��~�d�c�'��53g��3X�QX5P3��EuĎ|p8
��y��X�����m(D^�H�+�u�^y�!�'RԜ�у�,P��<aƭ�cɉ��~��=4�HL��X[G`���;��-O�9�kJ1NڇV��y1��Ƣڡ������͟uOO��9��A�R,�G�A"��X(f*�d�;Oߟ-F��K��u�j�MCɒ�pi=�;1m��Aǭ�-L��9��ļ��L�:88wFuL����J��-~rvys�<`���S���|�yR�ǭ��.�pF������j7��.�߮0f��.f�XWk�\�--ж��9�{���
bX�g�f����
<�����w� ȷ�?Zx�P��BN�?.vo!�����\;�ρ�[G��l��,�a~1��S�?1�����y��m,J��[R�8������7�H�δ�`Y[0c�C8!�7J��}~���D	2�I�SGn�2!���.�p�U{���1��Y�8|��w�@���׀�pa�Y�磘�"P�+A�i���vܘ�t�K#|��R��@Ȏ==!�=c��$���)���	P^'�Oz��瓉�7����{]}_V�)=��RÏ�շ��*$��F���Ӆ��FEm�,�j�jY���)����MՎ.�M"]����(��j6��Y!=��l�~������Fm��U�:�m�!'��	�]�8������۪c`�p�~2	9�ڑ�@���v�Ĭd;:ۦ)L �P����p�dJaw���QJ��$.l�*��I"c�ꇚ��&��-��'~�(�Y�A7:
�����?��|xw�9`�F��� ���3�T�Ū1�3'��S�Rk�ϐ�9h'[���+ �.�K��ZNJL�݁cWs���G�)��5��]�UfEN�c �L��:��/������<�D�[(��ڪI���\P��f�v�n��i6�>�?�"�rA�l�p=���8��uIJ�ٗM�]��g���b�p=��+�߅�ל�g��	�}w8�^��g�6ĺH�ew��|��|�����tV�������;{Q(;sp�������\)�q�����	S�)U��Ƶ>&ve��[�ߣ���y,�V���~�����ŏ��#V}� b1��kp�m1�l�)�:]�k��H2�˥b�#��D��b:=�~[��N�I���yQ''+q����y���oj˜�7N^^|ז'�=C�i�啹��݅��色~�ˬ���̰�)����ڃ��<=�K�p��y��M�"~@չ���ɾ���D/VP�<9���@����L�K�!���D��:F���6ʩ�Z�Ca�!xW���B��qxf	^.�h��]�a��ς�'Ɵ~��K`|*�π�{���݅À��2v�)�p�ڜ ;kIzs�=Ы�"�sun��.m,;U�AQ�C5�����s����wP?#�җW��7��6��=<�K�~08������-�Y���a�����m'G�[�,'���T��}�����lZЊ�RmF��4Ԉ_n�)�nv�H��y��)�?���8Uex�3/R�W4,�(?�����36Op���M����1�c��rQ�E�j�l�fUH��lr0��F��U0Q���.,@��.�K�}H,�#w����/�]��W�V�q���$?���$�[s{�j��ry��3�!
��fK�߲���|��m�|�@k�G4o�� tc�]�i�ˉS�K��0�&�,H�%ۢ�N!�1�㡑3�Fܒ��Z����	������ݓD�̒�]�;�ߺ�=
���� �F"o���R<1�:�C~�����3;v2��\.��E+X���K,$������_lşj�͵#������w����n���a�#9R�6	�4�B4rꬰQ�c'"7�Le�d_�چ�¸�}�<lX�YYf��Z\s�lj����]+���eH������O���8��w�:���{_p4x��J�$�b�ie�M���6߲�8�{M튃k��v�[˹*�fg�t��,�)NG�d:����{4�c�+&�|04P�b�Ș�2�Q�D���f�3Mv.B�M�4��nDR(��Vx���q�-X)��wQ6>9�
����Ё~�?a��G��v���?8�T��[y�;@n�P|�ʲ�h)X)�&�lC�~c8�����[�dV3�7"��\��6��V��<I�t��ݟ���W����f��;�^�K��؜?�t�t ��+�@4�b���pRL3����>O�7��S�LU�	�,&��MܑH��F��C�D�^-|2ޗ���Te��Z�ە�f~
d�G�ݸs� �tn?7yo%�,<Z�̡�!�88��@eU�@��le!~f�Sy2��SM��T3��5K���r�cs��Č�]�
Cd�;�����Z�&���k�_nWN��:��I
X��;w% ���Q�PQo�,����VB�E�󭳚���:��=T�qk���-�َ
��˳ڳ^j�?ì���[�c��ӛ<dn��nk~����gb�~��k�6}@|�(��Rqr@���CkQ�Ml�8�)����b!0ޣ����+Q~#�֫I��݉
[�m-k:��4�]���K������4]��0�x���4/}�W4?�y�w5�7�XޫҤ �u��C��K�_�#u|XIr	v����E�ϱP�4�Y=ٸ��k�-2ID	�B�`2��,�N���Z���m��3a%Ox���z<��
�)ѝ8�:��t%B�n���P[�p�j)�p�=��j3ރ�?�����M)	�
K�'�X�x��2�GS3��l���Rf�������x���w��qi?1�a�� 6��w�d�Ļ�d��|k��Q8[ZM3q%��5�2vݩ�������v;]�{�D����<��Ϫ��������|3��'}����~����`� �#�B�M���pM�a�(�N��*R� �&rPk�3�Y⎒dT(ɘ�))��8���b����h9t���em�4A��5twߏ'��4�4!,�F�B[�)l��.!o&�H����
W� _�9�-���x۲t�5�\f��t�Xh�>�2��G�`~�>}WחΣ?er��͡f��1V_B�k�G���ԔX����l��h�Oo�W`ЯH�T�&����d5u��h�����fr1	�/s���� ��(�������	��\_���	�+�+��Hh"�#�6�6�Mt'�lρJ4��s��p�-_iR��(a����%��z�C;
��of�l�RҬ�I��������o>v�}����N�ۣ�usae���� �l�������5&LX�.�<��$�T/hQ��hբ�
�C���_2����'~�oTܽc�����_�,΋qз�
|fA�όN����e�����I#�)FE�7��1e�d��l��\����V�`",Kw��{��A�QB��d�`+!�E/(#�c��Fw�Y,��R"�AHq|M�$����{r�K
g-p�s#���lr
�KA=�Q�����[[o���M�-ܭ-L��ֈ�p��&Go��lh�d`�������o|�n@�w��ĥ����������3]��K�yk���*����:��'��2kag+���A6�刍@��S�~���#>TP�BȌ��(�Y��\f�K���!cl�
b�4�m��g�Q��,#qb�x�'���E�������
.l6��b�����$�G���oA�I�Ϻ7���+=��9����l��N /��V�6��!P
8)���l�l���(�1zO�w�e&gw㧋w�<ކVy���rY������h[յ.�TW-��<�|p�XX21j	4�jͮ�G�
�- ��E���V�H5!�
gpO�+?o���<��^4���ro�Ŀ�8=��R�����_� �/��	�|��~�&0���:d��T��,��沟©1?���u�xg����j��f�~R��X�~Fj���|�SE���f2.�#�DJ&m�\Rx�l����Jd]	�4X1��Cm7�j��#LB���ƥ|�����Wq����_���������m�:��}��4l�j�O�6�6.�q���άȯ:�5ԱH�SA,������]�h��JC����Sԡ���5� �����C�'�,�H�y��]V��F}r�~��>����Wã�
�n84�1�S�DO��k`@�Z��b��,曙���>@��k��ƭ��t.gu��/��VYϖp�rH�/^o��2m�ɀiӝ��W����`���PT$�
7�aV�@z�����[�iʸ��	�� �R���B6����A.o����� ������§f� Uڷ�W��"�?_o.�X��p���Z�<f�H���2�G#�aq�+�B&��P]����a%s)Xe�`1f�@�x�N����L
���_��~K[�ǁ#ϭ�����
�]f�Ҙ��Ho���:ס��������|ǭ-��ՙaq\��6�9c�;M�t����E�F��k��ƽ�����BH��=ะ��˽��p����:��I�H��J�BWD�6���j�c��3]$6����X/%�]�2�uU�	\��������_oT���_
�����0���5d.i��/��%i$�8f�{�XH�ﱺ��u4�(�<?�l�,��S �dc!���s$7\Ҋ�&7�t�OE�T�o�7ٽ���Ca�eF|!/LS�J[`{��9`wa���p��d�����>�/�{�;�X//�7a:��wrc
b�?4��a�H��.��+ y�%Y+��+8���U�F�oÌ�f+h��Y�����]�UQ�aTw0����ƍ��L�p]-5��EDi�������bI^��~~������>��Q�l�$�?^NW`��Q�i���3�eG+i�AD@�����F��U�֐�*g�|��r�A ?J���h ����|�(�
��'������h��L�B�>1V��� ��r� �A.�6��u��B4��N/؍G;��sH�-Dv�@"����vT]a��1���[��x�l��Ӛ��>��w���	ou�P���{�C���������k�DR��╇�]�j��\�s�kes��7����"$�B��uի�1�\�\E *�{�ϿԷ��u8P����@}m��W������P�"��oF���Z�;�_�l;���v�E�)�A���w�e�a��5n0��{��[�b]��ΐ
�0V�l�e������_@��0�8P�2�॑��#C!JDz�6��y�.�?�2ݒ���3և�#�iًT9�-'7�U���N!D�&#��i�0|p:e���q��\��/��g����"��8��t�e(`��dgq�=�H�x^NY�G�)���;���EŶ���;�y�D��
���qZ��^[k�t �F��g[���`�>�������1�뱟���(m���/1�=�)c;fB��f��jH���{�ʱ�����f���#H� j��)��E!H5����_6�w��v�5������ ��t02G�Q�r�c�v�kC�*�3ӝ�z�,�sv
��EwX�7r}�Ba@1�ުUe�u�M�⺉��s �^��x��0p�m��������U�ۼ
�Wb�$5� (����;�/���#�={Az�׶�W<Q�xm0�0e��,�݊����/��+2�e����R
E���c��*��N�}<�iޮ;��L9 �y�[+_5m�'}�������~�yͿ��|��+m��v�4`]C�>��Z��<Q�!�OQ��Ea#"}pAF�$��>
����Ҷ"�}\�z^/t����55�HM�H����/R�_� __�����]�q�D��A��6]��TM�M�Q�~�p�5�U���B�*eK�i�ܡc��}jcz�x�-�5
���G�1tc�\��_غ���0�
p��$H�ܨn-Q<���@n��音�?��]����KHڏ�0w
	�[ O2$R�y�	��/&v{��
��6�Q��� �<1�R��M
U$Lܻ���	��v}:<����55d!ܕ����w�P��o'�\����9���y�Zb��kyU�o�~�������~�Kx�ehx�BǛp�M�d��b˫�^G����Z%�j��<T6�>�����8[��2U����fꍫ�:1�<�b]�O��W�᫏�����Ӈ�Y'�[����8Wԥa9W�8�iE���;5�����nh�$�o�S��Kb�gw�o��T��Gq��@mjkI� CeUR�t532^�-�m�u�.&D�A�҄B����.���f�0?�H��,5;˗凞O����T����r�
��5����ާW�.<l�G��@f=�&_�c��eEBp/Ǒ�y�ֻ�H>�g�"6;�_w��YOZ{6O��\�i$<Q�0Ro�N���jr�f���u��I�O����-֦{M��5a���'6��X#d�	TL�n��ɋ����C
��O�ք����""[���O�]f���D���n=������o9�4�j�NWNz�U=������N������{2�ڸpА|"�uA+#ءG�:�Qo���R�j����V:&)�L�<��.�L�l�ë���l�
�R����	Uk
Z��1=�q� �.
`v(B�X��Ԟ��v� �!��Ի5��ۢ"�`nPkhŚ-U*��nR����MN54�(�E�,{����EEo8��F�~�����A�ډ�%���{���j���Z*L�d��`�ق��4����䜑B��V{̢��m�i�(�l��\ٟ��a��BO���L����V��OV�uИ�6_��gl����`��a{��V��+�
�u��d��5�w���g�#�
����ғ��j+�]ϔ��"|��369a��D
��G�U>���������j�̬��a�I��[i�\�kD�:\2gn������9��Zlu-���J�`M��6��� kt��
�ζ���F���z�~GU�^���;����H�l5cX���G��6��p��`��V�*��\����j�o�٭R���U�R�2	D��C��g��߭ܯ���K�{o���d;'�.?O+tan�f,�	a(��3&�d+���1�	�g�d�єٴG��u������;9h��&�'��`�^O�%��f/��~��A��/ֲ!���1���F�2 M��p����v-�e�5��麬�Φ���Z/ʍ�'��!FP0�7�1���8Gtm��Jc������-Z�^�q�^
ϻ�h�N��78�҅�VSRH�����b�ZjSJ�w@85���
�!ci��P�<�e��Fi���U�7zJ_R��T���� �:�$Au+	4��͗8����6���%��
�,�C���"��ro�#(������Q�av?j'��]���8�*�v4�kriw�֑w��M�Frȫw?�|e=�gEsO�$����B��#k2��
8�ҬX�;��׵4��@ 4 ̅����ⷾ�l�,��c0�^�f�B�.�u'"mB`��F��>�GyNzC*�ǲ��L�$���;xX&Q�87�����`��VH7���a�)`���$�ɦ�Xʹ��2o��FcuA��@v%�d�Sv����b�\��sz�$��WR�BYz��y����k=CұSeC@}A����1��76�C�Z��"�:�29����eT8���0D�!�;)�U�`křJ��:�:���|.����ߡ��P����1�*5���;�EcY
��,���Ǝޜ�G~[Ng(��@��u�*�r8= Kɛλ����|h����<��l��AZ4A�X�vߍ�����2��a�P?k��{I<���ls��xWդ=RH��p���*�2��jq7�Aȅb]�t-ͦ1�����Q��զ2c~k7!��Q�/7{f8.%�5�|����r4���v\K��f�um���a�ėS �l��e�7�#8�LRr�\��zo�cuUM�k�؅SK��H�f3r�\r�~��~(g��캧����x!Zl���-��V�<H��v�F's�H�[�0�d��dF�̳6p0���R۹��,�י����5=.�,{%�'1r&~��g(:���
f�ͦ˃��>
{Hrlۨ�P�A�I3�ډcY�Rb�m��1����[�sh������=���GS�ė��L���%��C=�H�/}yES��׍�8�	��D4���X�ם�\p�R�M�d�Q�3��=�֭��#p�N��EP�C��
�;q~���8o��L�W�Orx8�����,2�i� ��6@�)'L�l-g⢁�L� o2+bk˓�f���n�UW8�]���P_
�Yz��M�Ŗ;5x���^�����x�F�zE�U�H=�rP�	)��zN�$����=��n{�o%9`�qK��C�M�s��Ʊ��B㫰�P���^�����b��
G���������5��Y�Mf�/��6��T�BǪ��]����s�;���ξ{��	y�S�$�����0���<�NO����+�>}61���;��*.�T�.s?~��{�E~n&�nn���+�SY|)�.�O�����<&w}YO����X�+�xH���(�'i[�5���:�������s��{i1����3�J<��F�[�Yo�{�~��N}B�y�����^�E���
���Ѳ�U��q���Z^YR�~��.��~\�L�/?�<��{���[:�Y��z�1��6�a���gLӼ�����<�}�]�^f��N?��g~�~σ�Ϗ}�L��/5ZO��0aO�6h�Λ�FU��~��4ב"3Dl��A;�_m�,[&[ra'���@�)��� �lQd����y���G{:t��A$_5n����Z<�f���`�ko]�"]=b��`B]Lhsq�:Ӥ�'-Sͻn
S�N:��M�ܜ�-Ҏ?�Z5��9��$��G	��-��|m4���oA@�����h�K�D�X��x=3i��+�%�6��ѱ�B-�\R=zp�/W;8��Z�.)`.���!w\��H�ҍ�#�	1�O�����*����_]���.������>�L
5��u�CUԬ|��M�(��ҧ4�O�.���3���M�� ���Q7+���˲m�l	�������������?��½��(������Lׅv��{7Y��}?�W�i�U�M�?�����W��	�
m���V�J�B̮�4�i�M����K�2����	?�^�>	���S��ݜ@B��1���E"�������<M�0����GVn&�[o�Z�k&�ۈC��g��)�.EB�l����D,���5`x��z��p8 +U����f�J�q̑��6�p�rR6��q�Ƭu��9{"��U�{Y���@��L�^�+s��P����i8�v���нh�w]Wf��]�g��6MÑ�ٱ�`+-j�d첛і;ݤ�Q<�`���������ȧ���L��8��K��3a�7��esн�8(��4���(�X�q������2 ��ٳ˴E��Rn7��N��95��
.�>�{q�-�QW�A1Ɨ@�}$S��>�}-�x� �յ���e�`���^`,#I�l��U���hL�����:�N�K�I��;d��Ml����N��Y����Mj�γ1�+%��9-�]Y�׿����z��!s���/^��h(^v�~᱋�j�t�z2p~�I�	4�������"���yM*�z"�����)���s?��4H�L���ȧ�`�f*�VO��y�`�Wӟ�_�1��n���aRK/K�Bi%�cVV��c�����l������n��@��H�9u��~��NR�'����d�K���ۏ>�r�����B�`�^�B�^ �.�y^
� ��[��7bci��(�a�lM�d`�N�$��{$����8p��&`Gn@���м��#L�3ܷ��<�j�t0����K��h�~��p\>k9�/�F^Ӫ�_	�N,}-�8ɞt��j�d�	�D�$m�")� �G.�=P�ƶ�TA�����_�ǙM`Ewqy�c��dg��=�����!�|/�{��y�{�����[���� ���5<R��@�mX���R��E�,f2KO1��ŕ/.qRV��;t�G�V4�ö=�S�[4
�]&�8+r��S��W���Br�W퍠��J?�l��������<0d�^'�ú-K�F|T�ʗL/�߻{ZV �W�53���$"��p#���8�X�qgn���%�X΋���q�ՆܫK5��Q�
`�F��{��x(����}����>����ͭ_ϒJ�g�?$:����m飾l ��ez*� ��^��#���:y�g>��f,��0;_��g�b��/9���FF�3���}�Bmj��;�㔯E�<���c&��Fz�Otnmc�}(��#��r�'wذ�cE��w�f�ex�g��v�j[�h���ec~�N����E"�mnJT���B,h/D�$s{[z9����&����ع�T#����]x�gwzoK�7�dI-&�4�@���_,��J�;����V���og�|��;s���4]u#n����s�[u�s��_�Zyo�:+�����ғ����ݟ"~~bHJ>/��Ƽ��|#����Wy�VY�oCZ]�H��:_շ�
��A�a��J��^uuzwM�mm��1�rlb��<�Rc��fYtTS/�mh�+��f,��ƚ��V��[���
<Yi�ќ!K{@2�͘Γ �I]y��7����k�`��&D�r~~V���2k��x㓬�������_�Y�ܱ8p�W�}/t���9XN:y�����	���
��;ٍ���O݉�����9M�+Q閟��uhȥx74/$Ϡ��]�H��u�NN��l�F���<�j8�"�"o�Ft���[�2�L	i-*)
�k>�ȍj��f���r��e�,�4z��2�G4�;��G���q�1�'��4>ސ4��V��Y܏gw�v�S�õ��K��(��ц�M�������n!�iE�{���B� r�
����r�#Ja�����[��G���ri�;b�D�kg��
�( V2��5X�fw� bm���D�$��Pe6�γ�Y5�>�LVq�O��RF��*�=����|q�ھ� ��6�/K����y��\"�;�I���o���Ҹ������-Dq�/��M��@&���b޳p�񶶠r�4�m�0�1�G�3��spqq�)S�����3���Ne��$3�(灰�P�e��φ�G
��\pYoq
}
��������E��9@�a��k��t��^��B�Խk�?��p~Y�=�.*
MIU�
ЙX�ԭjή�|�J��`Q�(K�%,Kw�:Gz5I6��]�Q�,w��#PW�b�R?�#�}�ˇ���t��9/7{�`|`��	�[k�޿����͜O.k�������4b���ܳ\#���L�o�f��i�礸3gẨH����㮉���+�y��:)z2��&���F�i�yYD��{O�������b������,L��q'���v(e3i���;%-T��J1�8�x`6U5�@�k��^�8$��O"r�~-��m�wT��tnw�$����
�>~�(�R��y�Ä>�V��<+����x��P#GBL����ȯ���8�σ�I�J��[<�S*_�����-�Zx�.7X�A+�(v,��x�5
/R)?�)�,����O�.k�ݓȮΆf�@��È!��Z�����t�Xk��@�q~Mvz6�M��'�<^�W&�V1�
6��D��Q˦�X�*`�>�o���ţ�` �I���A,�C�+���ggt@�HX�zoi+q:��{P�r}~h��1<B+�j'+�1��T(����0�(��`��e�n��-@��hSu�0���5�/��|yT">���9�K�ৗ��IY�ߢ
%F�,2� �jͥp�.�&�C�����w��<��
��	�3N.<<
�j���X7c O��Eh���+i�s�j�����O�lIcn�F~�1�`��M!�
���ظ9�<�oV�ѳ2�.��֡�
�"��Qo,����Ҙ��&��'�M�M��©&A .��&�qVOiBy̸�ۣꛙ�����w�ӎ�5��]�UfE�-7<�~��4?�}N�����=ٷI�&��n��<��G�������+�H���UtoO|Ւ��'��n��&�D4�3å��T&��Lk~OG�D�}|[���F'�^�����e�nP:�lX��>�C�;ճ��I����:Ka�p���
�ڙ��Ȧx�m �%���� s�$��n��MRP��l��
D�U��+pm���[�޴�4�?^���	O'��Z�cX�hO�%Oݶ$�d����Co�����M�y~wj���G�y��ޯӽ*�|��'L�c�����w<�y�u|��m�ƹ�:�CQ�y�����~���bW/ �.}>���:�y��冉�mR��}��f�at������7�P�To=�8Uex�,�y��~�|^	n�ϝ�������ſݨ^W%�Ӿ���A��©x��2Pv�TΚ7<�J�Pl�*�LBC=�Ԍ�|��)�� ��r2p�ϓ��e'�'W.��sfǹ�L �ٍ,R[hAq�*`�/���b5�X�v�żݩ�OOeu�A'��g`�Dj���up�?[c�j39���Λ��?��o�m�l�����n?vE�,�ǳ�{�������Z�(k�b�l�)� ت�TP���]4]�"��z�1�@�A5��Qie�Dc��%;J��;�Ù?ov[p�O�ˍ�:�$|5y��}����雞\���4����UӒ�|[`�j�Z`�f���2�	��=�ؤ!�;��3bq�#&u��s�q*v��6��[��B����}��6o���p�(N��i�l������O>B�M��a�Ԉ��j����Z�k��|�Ur>G`�c�q/�x"�6p��y��}`G
m� <wKN}=�]P�ei��V����D���G�g<���t4`����A��f�"L)���Z�&�ZB��P ^�n���1 ��֌��1�"�vi��� jB4&W4X�l��Uٝ�B|�ߺlWt�g�O�����ǽL_�3tz�?&	6jFU���,V���l~�/��׍Ŷa'�𡉧�Im�b��G���O�I\i��:ޘV�;y��6���d��&�#ٷ�O�;����Rk��/V#M��]Ę���ʣ��a�~)�TZ׋7�<|t���n��Ϗ�PR�f���KVK��`�`/���5���<��!�����8�v���}������#�eהOҾ>��'9 ]B0掬��,r$#�F]J^����cS΃Ŗ�-�ȮA�Y����3���B��N��|uW�A�`��I����)�C������#ɼ�wl��f�р �S�l9�G2�=���,`?�{�x7���_o����k�S�������[���ɢ��]��~~�}�cЖr�7$��0ݼ7��X�b��Gz�� �V#5(�����S]EX__��p4vna����1�u�L�{�w�娛,Z����p3]���쟛�/O��O�D���+���:�u71׽qDB#r�d"g��m-V��뜏�ICG�0�8 8h-��#|^�l�����L�R��)p�R��R��_��/������N�
�=�7u��p�%�x�P�K�qKc�+�Hs��D=��V��5	Oͳ�(6��:K��"�l��pfq~S4sV�1eĄ���/@�(�>�z�_s�3]�
콜��"��(��v��Ёȃz4��Z*�5i��J���9tSJ7�:/Ŕ�H>	Ԑ���`k(D02�-n��h���5��%@����6,~4�ſ_߻�W��G��nF�7��Đ�2)�U�ԏ�n�� �z4rh5����8�ZQK�b�U�"~j��a9��cj�Tc-�	\Fr�N�bM�_�{�m����������!&[Y�P��1��F`���f"��
�sl���x=����=fVj>��L���E�xí\f�Yf5��1�O�q�W�����2�u�����/���vE,��X$���X�{����r��/�u��eFǺ`ͨ�b:��%6e����)��u�u��2}�ٿp�:�~���^5{�{�^�d�d�;\ďjVu�3-lV����1��$�d 5�k^��M��&�&;���u?�}i��lX���u~}겿���ny���B�W�`��Ѳ�4�����Zx�:�W����f0�[��b#�RŹ�u�KZ+�9�Q��#���pH��V*�}h��/��G3��+A��x �W�׽|�Z�|�h}t�!s ����8���^;Ri
�L�yb1��Z{��z���ֆ�Xc�<�?`bI�Ǳ1����>�e�Q��,#qb�vD��RY<'~�سKC�ZlچN��Ԕ"��� o2x���z������%�b _��6O+���h��*���#1$M����X=����1qvsU�� �3��R���&�b��ʟᓦH7�2<��18��SiJ���Qʛ��o�|!U���妭��|��m���;{}�ȓ�?��n]7bd���5T פO��>�{�9`a�JZ��c���w�5�1C*�mց���~��qX��UU��*Ă2���Z��dZ�z��YLN� YX��N�����6;��ϚC�&A��͐�C�s~'zV���%hk "Q�א5�h�����:�l*�d��B�l�}�� K�ҍ
�*���l���V�����Mp;;��cd�#װ�5x�P��v�#,!�o��'�w��VT���}&� ���%ni��3ft4������]I��ڒ��_QQâ<t�
**T�Ftp"Q:i�x��v�n�=���A
Α�I�ɕ,2se�E{3<��k�rCs�v+,R7����	ayc�4 ��ia���0�%5�b2Jʤ��������_hiո ��-m��l�"�l/����獢�e57�A=3-,@L���[�A�/��i�Y��hF-��wD�
�c�ޅ0���l)�,��XeL\]�G]>݌��,]ac��W��}I���ӿ����m
����~]dK�~���.-��x�iZm�B3�P�M5�J�sójwXt6?O�H*�z��Z�x`*,��^��>�E!ι�̗҂>R�^�s� bDr�C �Kġ���4�F1X"��#�U�u�������z�1)�OoR�e=�R�a�Z��H��"��n�c��e�N��e#�R�dűR��G�a�b��I��@vEnY�4Y�2����Axґ
�}���]�ƽ�?��q^�ǤŸs��x�I&bn��]1Z52�� �o�	wdQ�|�g|^\9Z�=К�uc2���A�h|Z�=E�R���kvg����\�s��+_լ��f�5���Y#�Z�7E�~���4t�k�%Z�,��i�_%|K[�Ly/9�%�G�܏��3�˖��&��H_~K}~��wX�|1�����g�9�8�g4c�M�oK�b�<I� 3'��
t�:�pe����Y�:MCѪ����������Y��ך�t��$g�pp�F��!]���:zS�y���8�����������l!̫7ԽJ������<����٥�����{#�W�|���f�l����ûa�"D�@$��<�
�D���:�x���P���4���~Q�y��k��	�Y�B!E�YЛ�]x5�z� �$���F��w���E�Og��K-�������2{�JOcϊ�.B�����xv�i'��ꫜ��՟����������]���kX�I�M�����t���u��v�g��W�}�S`L)�ނ+��˙"a����,���Z^�:h�[]�6]���ʃ�^^��T
%�&#�n�- �V�]�q�8J�M@
f�����r�8�
��m�w�R��X����'���כ����\on�n�[�ނ�<ݑ�'��h���
�G���g�l���cЩ��{{���}/q�.`hϐqs؇�ۅj����d&��=�M�|BIә4�sd��{`���;��9�o��(�3Z6f�5�+����)��ռ�73=/u>���� �Z4.��tU��uj���n�vC�*5𲬱��Y���k'�6-���|�nq�.ȼp�{��3���6?�sE�ϼ�lM>���
�Bx�/��m�Fy��l�6�?�j<��xO��"� �!ʪ����Q���\��"��·�݁k�|���
k�Gu����G
�'�b5x��t�^d[a'ЭZ:��6	~B�?�e�(��@-�j���� }�]g4vƧP�gQ��F�Ja2F����}�g�=�ΐ�L�Kl ���7�.��*=�`��J���b�6N%��-z��m��kWp�d�_m�wv���	��~LQ=���Z�"˰wSԞDd�,��"�ӌ�βd���<=�����"�{d�!{gd�R�v9���h�"D�w20������i)�6
P�^b;��?+��G�ؑ��/�kI�|�Aڹk�rP�,U&{�&~0AIPUo4+zByCGp��{�&p*'�,�ъ:�\p��-3Pun7�p�;��$��gLZ/)��v:���y��
�g�y��,ȋQ���"�2F�"x�~�\S,ee�+VW��P�=� q��E,�.wFۤ8��W�p z>�F�C00^S�hP�o6z�n?[�s��w�)���]�/<y�j�������.Ӱm&2��(����(���{?��_X?�V�~�i�����GE�
8����t��p(ټ�ׂ~qX�C٣����8zO�O�	.�\�Q�%��(�c� �І�NJ����:u��C�gC��m��e%���Ssiѹ���H$�'�)�w4g����o1_������W^��h��A�|\tT�'�B��H� #+{�C6v���_6[n݌/{Aª���nb33o[Ҟ�/8~5�jb��NäEC �d<d�ͼK�#N����0b����Uc�U�VF$�.Mq,����)�NTSQ���(>�QF;w�v���~���b��ڠ�Ƙ���=E�ܼO%��<��*��� UO���@~"3����^|G7[l-z���|�[�Q���eҷ��N�[ḋ����؜|��g��ֳ��(�ϝ���U#��M}Z�k]���i��k������d�vJ�Ev-��pH���s7�%�g�f{�w�x'��7<0�^��XW/��/:5ן_V��dw����@��1���b�Q��"dF��n�%C�x�R7�&�AX`8Wh`�A��L�4�����&����ujA�L�ۈ�����\�K��\�;p;wI3���H�ί��L��z�yjW��� ��Cr �d#���D��-$o�	!�q�RN鳤.� G�e�~��W���f�~��u.�5���z�W@�.Wr����*��<���J�G�����t+��c�L�6�M���X�@j��q��&��!��I�[�*yu~�k�AQ�[����گ�.*��]��dޟ�Ȟ��ۤ�^]��d�/��~�}��f��ۥ�.PR�*#k�c�Ā2u�#������YG�M6I�e-���&>�5E���e� BQ�|2�5�i����M��n��D�|w?��
��'�Z���Yy��GZu�(��"�'"[̘�h x��`�g�(�w �]�Pv׉��3{�����8Y���(��x��fK^c<�:>;%�ZA+�{���])���e��w��ܮ�k9\u�h5���,�*0�$�+�2�;/]��8��[_�_).���b�i���ȐR�.�4X���e/p�c�
iqfA����v�GdK�l���k�����1{�ς�
��p���8�?Y����!h�G�_1�x��:H;Sp�� ��D�m*6�0�^Aodh<���>"����
K>Hg���#@Scq��Y�g$��|����
y�ղ�� >&3��^����B�"t�A�B�&���:1�4�E�Ei�4Z�B�TO����h4�_n]� �d2�ȩ%���wtsb�q�S�	�
�W���h�:�uڹ*�����wl�;eD7���f5�^e�|V�|��h�5���v�y�f���1伮��t�M�X�٩y��F39��+���\��	Q�Y��u0I��6�
��b0�x����Z�N��N�G��(S��(��'Dm�Ag_໵�JCx/޷@�W����p>��[��0���qu?�&��a&�F���R��j�5{(��J}un���<Z#�*.�_˙�&�ڝ:O�܋�~�{gi�����^��:�EL�c��V����������s߈G^I=��|���a�a��lz�ܻ��c���l�
!�Zh��a�5�9�A7� 7
�����b"Jݮ�v{Y���T��
~�6�R#j�]��ǂ*�U��e��D��8c�l�2��Nkx��Ks~���bL,֗qwF�� �7��=�A��N���-�����Q�uZ��Z+jI��R���X@����H�o��ݏZ���y#���:5�E��	ޡ9Y�VP��
� ��P\�;e�7������}|La�~0�P�w�����=���AXsN�XO�;m[��_pI>p�.�����3v���y�N����v����� n�{�_A׻w�������?���=�Xi��~�X,VFPL�
(��&7�b��dh��OU�ĵb���@�C�)=e��އ82��M�+�30��{��|^�k%����Bc���ٙ�DQ���6�k�HC�h�NX����N�|	�> �K�.��=:�.ɸ�,�nOˎ�x
���:������V���W�:���ژ��S����.�_mb�G�(De֒O+D���G���@�99�C�ǣ1���l���hk3XJl#*�O�-��
'��!ˉ��
A�x��@h�鉚�� �V���π~������	����g%��Y�'�=h����X�f�B�.H���
i���d���@ B��ěG��������O:�s�M�{���.\����u��z���h&��ݐ�2Yj���ϟ�e"a+��L���K�p1Ӊ1�O5Cnp8���RA2nN�|Ä�d} �,�r���Ma�Y�a?��%���{y������do��T9|��kR���=Vd�_W��$��գq��.ш�1E��K��R��bw���j�.9(Л���,���8�	��:V�c�ׇt_rr:��hja����j�
�h���M������\���r���z`��B��u��ge����?��?n���*x�uR�n�0��Q΍I"8����cU$�^�-�ٛ B�{�HB���ٙ�ٙ��E���7��&��hE�d����E�<����m
��|;�d�������t���O)8S⾓,��T���D\K�a-��X
�%nh�b5P5�;
�߂		�sJ ̜�@�mH�/J�1����b�V�Q\Dx3e�L��?
�V6lY��#g����ֶı>����e�-�3�F�-]Z�K�e�_�����<�F�3z��qYS�4�#pSpf?6���� m2�X�NL�G�������+ ��om|c��Q��w����3�L��/���w�x�K��+.QH��K�LW�U��RP(�)M��+�R�Vr(I��)��KI..�/�/.�J�:\��\\��E%
)�i��90#�� ~���x�340031QH��I�+.Kg`pt={�~�N��#ӚO�v�H2��I��O�(
��p���4�+���=N}�s�(/���&�dSOX�F����Q��g��N5π�)K-JN��*g�L0��3����ArR��ϙ�PU�y)��`U�6-���Sp$�ņu���K� �4Gv�x�]�Mo�0�����c��QRw�P���`
_jY���Kƴn�b�~��N��n���CΦy�ؾ�^�G���-�q��93뺜�`�6�ηk �����liVm�*
Q)ԵƐ�JpT�K�	���#C�"Qj�]g��>����+���9y��L,ץ�$������WͩJ�A�I^H�J@�FR�
�HZB��ǵ�G��2�+�@�~����<�qM�3x���>�.g����m��h_�(:�<(2?�� Ja��@x�m�ˎ�0E��lڅhQoq�v5� ���� vޓ��KI�$��aK���s��鲂~3����q؞�>��?��z�����R�b��˦��ڽ7B��<�|��?�f/��y݈��������i������5��t��r)��imو)��"��[�ˠҠuI�-j�+�F#�,�E�~F�)=��ٖY�ȏh#Gq�
�o��^�ւ�֢e��>#��
�bkXuK�֠X�'����12�1j������{��X[;��ܲ�Oq1��e� o��J)�O�vL<g[bt�᫷`�4JMz>���h$$�K���)�k���9�b�s��XL`Ƽ�T�J�r-a��<�ԝ����0Saw�K��+p3�yc�!�/�
t�F��R6��6��ȇ�:ha;o֙��H>�r�;�D�Y��_��PF�<�`�
$-G�H�eɿ�w�RF�r�
���|V��eן��D�S�m�u��vcu����8����������m�Z⤾�����пUx�uT=o�0�+�;��o�E.C�[�ސ�p�8���_p����S�CY2E���Q��,��q�ϗ}7���}���׫\���~����z��}w~=?u��<]�~�;G�b������mx�6�o8���}�J 7�&y�A�ġJXJ�2��R�j=���|�əߡOKp���$����O9��I>Z�z;E8!�*m.Q�g����^*�s1/�C�Ф`f�o'�$�ܳ���S��lQu��ݺ�Jm^�F���-���뜝*A���S�(�%��ɱ��5��/���fx!+�Iי�N���"�Y�(�t������f3r��S���,X��!�GzJȃ�%=
ױDv��

@����Yg�[��b� h��Ԋl#K��1�_$eůA+ ��V�#�R	d�4��Q��X� �ѭ�H�A���Ǆ�h'��3$�rc�1h@���:V[2�~4*����h��bCǆrP"�ߓ�O�:x��h5�)G�����XE۴����7�QШ���)E*�J������<v7
8Y�N
<%1B�(�h+�W��I#�N�=�d�����2nL�n�ZKNRF�YR�L5-B�5cʕ�جi���E5�a�������@��2�uH��[72��Spo��xXH�
>XGV��V})P��=*vpGe���RQA1UL���nX��֩�'dm�H�y����x�-��
�0�_Y���6%����Q�Q!&R�+�zc�io���>B�ct�r�%���T��$%�ʟ���L���σt�p����1�����L�v���UM�+?�����[��k̟�A$��x��P�j�0��az�2v-C���aj52x#q�����6%�HBo�v�������i��m��E��ˇR1Fs9_�*�Z+v#����|��A�XWK���H\~g�7�]��5��_��ؐ, ���<�n	�:���gFнa���X���C>��|Q���>�,����'�kZp�/�f���勗��ѓ�`�Fڹ5��7c��J۬
�\	�&x�]Q�j�0��+��&��^
=J

��B���Q���u	��je��9�43�잳<g��N*��5�=��G�o㝭����jĕ�#�c�j�ʩ���Z�!��'5W��l�}Nҽ��� ��A/\bƮ��� l������uKR'�:��Y����(,)�Έ�~�x"{�k��˕��,G#w��rt�|��4�
�Z��Z�&�K@>M~�uJ����K��d����"�Ri1e��l~p!95�:�'�;0})J������q�sI�
��J�o����Õ����K�.���x�m�1o1�w~���w��֪K�v;�H�����q�!�orש��������@y3�j@}�pn'6N=���(�"m�u����d���*%�e�}�Q�>�:���}}��V9�h�I�&Ftp%�=XF#X��*���6��G��Em/����9�`h�H�ᘃ�tN��p�m�I��.�N�2n�(�����n�`�I`���cr;����v?�%]�b8߻�E��޾���c�ECu$�x�340031Qrut�u��Max$���p���k�_*�zx�� �BZQ~^Ij^
����W%#v��~37���e�s
���S������=�F-9}���tѪUl�yە �n*���bx�����i��ȣ�Ћ�~L~8�|SU��qh���FKF ��
����ox���4�i���G�"9��R��r��aai[�� ���	��9x�����<A�������D!�����U/7�������{,�F�
�h��m�ob 
���o�ӽ#�s���S{������2��ن����L��7���(�V�K��jzAbrvbz�^Vq~����_:��8��CB�K���u�'�2V   U;f���6x� �����
,�YX�'���'��+�ώ����A�	��!x�� a������ɱ���n
�c�L�T�o%�.b�P�'���4�A�2�!������P����'�f�`��P9�@� ����B������9�<��	s�<*��DI��L@�
\F��
"�_g�oT��sB2<�n�Nx�[���2���_*��\�\ +�x�?u��i�Z-��9���<

// -------------------------
// File: .git\objects\pack\pack-1278ab3f7501dcdd69a85a2da4943990d813cb3c.rev
// -------------------------

RIDX                     !      -      
   0   (         +   6   $         )      *               ,   3         
   5         /   	   4   2   %   1   &   '                #             "   .            x�?u��i�Z-��9���<U/�z<�L�����
��=2��

// -------------------------
// File: .git\packed-refs
// -------------------------

# pack-refs with: peeled fully-peeled sorted 
58d3e6f60489e8afce816d20571b2428236f678e refs/remotes/origin/main


// -------------------------
// File: .git\refs\heads\main
// -------------------------

58d3e6f60489e8afce816d20571b2428236f678e


// -------------------------
// File: .git\refs\remotes\origin\HEAD
// -------------------------

ref: refs/remotes/origin/main


// -------------------------
// File: backend\main.py
// -------------------------

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, auth

app = FastAPI()

# Allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase Admin SDK
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

@app.get("/")
def read_root():
    return {"message": "Backend running!"}

@app.post("/verify-token")
async def verify_token(request: Request):
    body = await request.json()
    id_token = body.get("token")

    try:
        decoded_token = auth.verify_id_token(id_token)
        return {"uid": decoded_token["uid"]}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


// -------------------------
// File: backend\serviceAccountKey.json
// -------------------------



// -------------------------
// File: frontend\.gitignore
// -------------------------

# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts


// -------------------------
// File: frontend\.next\app-build-manifest.json
// -------------------------

{
  "pages": {}
}

// -------------------------
// File: frontend\.next\build-manifest.json
// -------------------------

{
  "pages": {
    "/_app": []
  },
  "devFiles": [],
  "ampDevFiles": [],
  "polyfillFiles": [],
  "lowPriorityFiles": [
    "static/development/_ssgManifest.js",
    "static/development/_buildManifest.js"
  ],
  "rootMainFiles": [],
  "ampFirstPages": []
}

// -------------------------
// File: frontend\.next\cache\.rscinfo
// -------------------------

{"encryption.key":"LRI68MpU+DjGhjWBum5hR6k2xgYKOfGcUUzrHHVh+Y8=","encryption.expire_at":1754670891587}

// -------------------------
// File: frontend\.next\fallback-build-manifest.json
// -------------------------

{
  "pages": {
    "/_app": []
  },
  "devFiles": [],
  "ampDevFiles": [],
  "polyfillFiles": [],
  "lowPriorityFiles": [
    "static/development/_ssgManifest.js",
    "static/development/_buildManifest.js"
  ],
  "rootMainFiles": [],
  "ampFirstPages": []
}

// -------------------------
// File: frontend\.next\package.json
// -------------------------

{
  "type": "commonjs"
}

// -------------------------
// File: frontend\.next\prerender-manifest.json
// -------------------------

{
  "version": 4,
  "routes": {},
  "dynamicRoutes": {},
  "notFoundRoutes": [],
  "preview": {
    "previewModeId": "6a82e814eb469e12d70887fef080c05d",
    "previewModeSigningKey": "c7d9558b27c3a0e1a11649b7e46299555809c2c3990b2637f0260e476e215ab6",
    "previewModeEncryptionKey": "b1ce69f7ecafff81e45225e644b22fc689df3bfa3bd87908b95b4c606c9dfdc7"
  }
}

// -------------------------
// File: frontend\.next\routes-manifest.json
// -------------------------

{"version":3,"caseSensitive":false,"basePath":"","rewrites":{"beforeFiles":[],"afterFiles":[],"fallback":[]},"redirects":[{"source":"/:path+/","destination":"/:path+","permanent":true,"internal":true,"regex":"^(?:\\/((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*))\\/$"}],"headers":[]}

// -------------------------
// File: frontend\.next\server\app-paths-manifest.json
// -------------------------

{}

// -------------------------
// File: frontend\.next\server\interception-route-rewrite-manifest.js
// -------------------------

self.__INTERCEPTION_ROUTE_REWRITE_MANIFEST="[]";

// -------------------------
// File: frontend\.next\server\middleware-build-manifest.js
// -------------------------

globalThis.__BUILD_MANIFEST = {
  "pages": {
    "/_app": []
  },
  "devFiles": [],
  "ampDevFiles": [],
  "polyfillFiles": [],
  "lowPriorityFiles": [],
  "rootMainFiles": [],
  "ampFirstPages": []
};
globalThis.__BUILD_MANIFEST.lowPriorityFiles = [
"/static/" + process.env.__NEXT_BUILD_ID + "/_buildManifest.js",
,"/static/" + process.env.__NEXT_BUILD_ID + "/_ssgManifest.js",

];

// -------------------------
// File: frontend\.next\server\middleware-manifest.json
// -------------------------

{
  "version": 3,
  "middleware": {},
  "sortedMiddleware": [],
  "functions": {}
}

// -------------------------
// File: frontend\.next\server\next-font-manifest.js
// -------------------------

self.__NEXT_FONT_MANIFEST="{\n  \"app\": {},\n  \"appUsingSizeAdjust\": false,\n  \"pages\": {},\n  \"pagesUsingSizeAdjust\": false\n}"

// -------------------------
// File: frontend\.next\server\next-font-manifest.json
// -------------------------

{
  "app": {},
  "appUsingSizeAdjust": false,
  "pages": {},
  "pagesUsingSizeAdjust": false
}

// -------------------------
// File: frontend\.next\server\pages-manifest.json
// -------------------------

{}

// -------------------------
// File: frontend\.next\server\server-reference-manifest.js
// -------------------------

self.__RSC_SERVER_MANIFEST="{\n  \"node\": {},\n  \"edge\": {},\n  \"encryptionKey\": \"LRI68MpU+DjGhjWBum5hR6k2xgYKOfGcUUzrHHVh+Y8=\"\n}"

// -------------------------
// File: frontend\.next\server\server-reference-manifest.json
// -------------------------

{
  "node": {},
  "edge": {},
  "encryptionKey": "LRI68MpU+DjGhjWBum5hR6k2xgYKOfGcUUzrHHVh+Y8="
}

// -------------------------
// File: frontend\.next\static\development\_buildManifest.js
// -------------------------

self.__BUILD_MANIFEST = {"__rewrites":{"afterFiles":[],"beforeFiles":[],"fallback":[]},"/_app":["static/chunks/pages/_app.js"],"/_error":["static/chunks/pages/_error.js"],"sortedPages":["/_app","/_error"]};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()

// -------------------------
// File: frontend\.next\static\development\_clientMiddlewareManifest.json
// -------------------------

[]

// -------------------------
// File: frontend\.next\static\development\_ssgManifest.js
// -------------------------

self.__SSG_MANIFEST=new Set;self.__SSG_MANIFEST_CB&&self.__SSG_MANIFEST_CB()

// -------------------------
// File: frontend\app\client\page.jsx
// -------------------------

'use client';

import React, { useState } from 'react';
import { FaUserCircle, FaArrowRight, FaTimes, FaEnvelope, FaHome, FaProjectDiagram, FaInbox, FaPlus, FaEdit } from 'react-icons/fa';
import ChatModal from '../../component/page';

// Mock initial client data
const initialClientData = {
  name: 'John Doe',
  company: 'TechStartup Inc.',
  bio: 'Founder of TechStartup Inc., focused on innovative SaaS solutions. Looking for talented UX/UI designers to bring our vision to life.',
  avatar: 'https://randomuser.me/api/portraits/men/50.jpg',
  website: 'https://techstartup.com',
};

// Mock projects data (booked or interested projects)
const initialProjectsData = [
  {
    id: '1',
    title: 'SaaS Product Landing Page',
    freelancerName: 'Anya Sharma',
    freelancerBio: 'UX/UI Designer with 7+ years of experience specializing in web applications and SaaS platforms. Passionate about user-centric design, creating intuitive and beautiful interfaces.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    price: '1200',
    image: 'https://source.unsplash.com/random/800x600/?saas-landing-page,web-design',
    description: 'A sleek, conversion-optimized landing page designed for a new SaaS product. This project focused on clear value proposition, engaging animations, and seamless call-to-actions to maximize user engagement. Delivered with fully responsive designs for desktop and mobile, ensuring optimal viewing across all devices.',
    designHighlights: [
      'Modern, minimalist aesthetic',
      'Intuitive navigation and user flow',
      'Optimized for high conversion rates',
      'Custom vector iconography and illustrations',
      'Consistent brand storytelling',
    ],
    technologies: ['Figma', 'HTML5', 'CSS3 (SCSS)', 'JavaScript (React)', 'Webflow'],
  },
];

// Mock inquiries data (freelancers contacted)
const inquiriesData = [
  {
    id: '1',
    freelancerName: 'Anya Sharma',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    message: 'Thanks for reaching out! I’m excited to discuss your SaaS landing page project.',
    timestamp: '2025-07-20 14:35',
    portfolio: 'https://anyasharma.design',
  },
  {
    id: '2',
    freelancerName: 'Michael Lee',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/65.jpg',
    message: 'Your project sounds interesting! Can we discuss the scope and timeline?',
    timestamp: '2025-07-19 10:00',
    portfolio: 'https://michaellee.design',
  },
];

export default function ClientDashboard() {
  const [clientData, setClientData] = useState(initialClientData);
  const [projectsData, setProjectsData] = useState(initialProjectsData);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [bookedProjects, setBookedProjects] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const [activeSection, setActiveSection] = useState('inquiries');
  const [editProfile, setEditProfile] = useState({
    name: clientData.name,
    company: clientData.company,
    bio: clientData.bio,
    avatar: clientData.avatar,
    website: clientData.website,
  });

  const openModal = (modalType, project = null, freelancer = null) => {
    setSelectedProject(project);
    setSelectedFreelancer(freelancer);
    setActiveModal(modalType);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedProject(null);
    setSelectedFreelancer(null);
    setEditProfile({
      name: clientData.name,
      company: clientData.company,
      bio: clientData.bio,
      avatar: clientData.avatar,
      website: clientData.website,
    });
    document.body.style.overflow = '';
  };

  const handleBookProject = (project) => {
    if (bookedProjects[project.id]) {
      alert('This project is already booked!');
      return;
    }
    if (confirm(`Are you sure you want to book "${project.title}" from ${project.freelancerName}?`)) {
      setTimeout(() => {
        alert(`Success! Your booking request for "${project.title}" has been sent to ${project.freelancerName}.`);
        setBookedProjects({ ...bookedProjects, [project.id]: true });
        closeModal();
      }, 500);
    } else {
      alert('Booking cancelled.');
    }
  };

  const handleEditProfile = (e) => {
    e.preventDefault();
    if (!editProfile.name || !editProfile.company || !editProfile.bio || !editProfile.avatar || !editProfile.website) {
      alert('Please fill in all fields.');
      return;
    }
    setClientData(editProfile);
    alert('Profile updated successfully!');
    closeModal();
  };

  const handleInputChange = (e, setState) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <section id="home" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] flex flex-col items-center justify-center">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4 text-center">Welcome, {clientData.name}!</h2>
            <p className="text-lg text-[#757575] mb-6 text-center max-w-[600px]">
              Connect with talented freelancers and manage your projects seamlessly. Check your inquiries or explore booked projects to get started.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setActiveSection('projects')}
                className="bg-[#00bcd4] text-white px-6 py-3 rounded-full font-semibold text-base inline-flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all"
              >
                View Projects <FaProjectDiagram />
              </button>
              <button
                onClick={() => setActiveSection('inquiries')}
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                View Inquiries <FaInbox />
              </button>
            </div>
          </section>
        );
      case 'projects':
        return (
          <section id="projects" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Your Projects</h2>
            </div>
            <div className="space-y-8">
              {projectsData.length > 0 ? (
                projectsData.map(project => (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all flex flex-col md:flex-row overflow-hidden"
                    onClick={() => openModal('projectDetailModal', project)}
                  >
                    <div className="md:w-1/3 bg-[#f0f4f8] p-6 flex flex-col items-center md:items-start text-center md:text-left">
                      <img
                        src={project.freelancerAvatar}
                        alt={project.freelancerName}
                        className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] mb-4"
                      />
                      <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a] mb-2">{project.freelancerName}</h3>
                      <p className="text-sm text-[#757575] mb-4">{project.freelancerBio}</p>
                    </div>
                    <div className="md:w-2/3 p-6 flex flex-col">
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-[200px] object-cover rounded-lg mb-4 border border-[#e0e0e0]"
                      />
                      <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{project.title}</h3>
                      <p className="text-base text-[#757575] mb-4 flex-grow">{project.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="bg-[#00bcd4] text-white px-3 py-1 rounded-full text-sm font-semibold">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-[#e0e0e0]">
                        <span className="text-2xl font-bold text-[#00bcd4]">${project.price}</span>
                        <span
                          className={`px-4 py-2 rounded-full font-semibold text-sm ${bookedProjects[project.id] ? 'bg-[#ccc] text-[#212121]' : 'bg-[#e0f7fa] text-[#00bcd4]'}`}
                        >
                          {bookedProjects[project.id] ? 'Booked' : 'Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#757575] text-lg">No projects booked yet. Explore freelancers to get started!</p>
              )}
            </div>
          </section>
        );
      case 'inquiries':
        return (
          <section id="inquiries" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Freelancer Inquiries</h2>
              <span className="text-sm text-[#757575]">{inquiriesData.length} Inquiries</span>
            </div>
            <div className="overflow-y-auto overflow-x-hidden max-h-[calc(100vh-160px)] space-y-6">
              {inquiriesData.length > 0 ? (
                inquiriesData.map(freelancer => (
                  <div
                    key={freelancer.id}
                    className="flex items-center gap-4 p-4 bg-[#f0f4f8] rounded-lg hover:bg-[#e0f7fa] transition-colors"
                  >
                    <img
                      src={freelancer.freelancerAvatar}
                      alt={freelancer.freelancerName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#9c27b0]"
                    />
                    <div className="flex-grow">
                      <h4 className="font-montserrat font-bold text-lg text-[#6a1b9a] mb-1">{freelancer.freelancerName}</h4>
                      <p className="text-sm text-[#757575] mb-1 line-clamp-2">{freelancer.message}</p>
                      <p className="text-xs text-[#9e9e9e] m-0">Received: {freelancer.timestamp}</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={freelancer.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#00bcd4] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 transition-all"
                      >
                        View Profile <FaArrowRight />
                      </a>
                      <button
                        className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all"
                        onClick={() => openModal('chatModal', null, freelancer)}
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#757575] text-lg">No freelancer inquiries yet.</p>
              )}
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="font-sans text-[#212121] leading-relaxed bg-[#f5f5f5] min-h-screen">
      {/* Header */}
      <header className="bg-white py-4 shadow-[0_2px_10px_rgba(0,0,0,0.08)] sticky top-0 z-[1000]">
        <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-center">
          <div className="text-3xl font-bold text-[#6a1b9a]">
            <a href="/" className="text-inherit no-underline">CreativeHub</a>
          </div>
          <nav className="md:hidden">
            <button
              className="text-[#757575] text-2xl"
              onClick={() => setActiveSection(activeSection === 'home' ? 'inquiries' : 'home')}
            >
              <FaUserCircle />
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar (30%) */}
          <aside className="lg:w-[30%] bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-6 sticky top-20 h-[calc(100vh-80px)] flex flex-col">
            <div className="flex flex-col items-center text-center mb-8">
              <img
                src={clientData.avatar}
                alt={clientData.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] shadow-[0_2px_10px_rgba(0,0,0,0.1)] mb-4"
              />
              <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{clientData.name}</h2>
              <p className="text-lg text-[#757575] mb-2">{clientData.company}</p>
              <p className="text-sm text-[#757575] mb-4">{clientData.bio}</p>
              <div className="flex flex-col gap-3 w-full">
                <a
                  href={clientData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#00bcd4] text-white px-6 py-3 rounded-full font-semibold text-base inline-flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all justify-center"
                >
                  View Website <FaArrowRight />
                </a>
                <button
                  className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all flex items-center gap-2 justify-center"
                  onClick={() => openModal('editProfileModal')}
                >
                  Edit Profile <FaEdit />
                </button>
              </div>
            </div>
            <nav className="space-y-4 mt-auto">
              <button
                onClick={() => setActiveSection('home')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'home' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaHome /> Home
              </button>
              <button
                onClick={() => setActiveSection('projects')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'projects' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaProjectDiagram /> Projects
              </button>
              <button
                onClick={() => setActiveSection('inquiries')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'inquiries' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaInbox /> Inquiries
              </button>
            </nav>
          </aside>

          {/* Right Content (70%) */}
          <div className="lg:w-[70%]">{renderSection()}</div>
        </div>
      </main>

      {/* Project Detail Modal */}
      {activeModal === 'projectDetailModal' && selectedProject && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[900px] max-h-[90vh] overflow-y-auto relative transform translate-y-0 transition-transform">
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            <div className="w-full h-[350px] overflow-hidden border-b border-[#e0e0e0]">
              <img src={selectedProject.image} alt={selectedProject.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-8 text-center">
              <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4">{selectedProject.title}</h2>
              <p className="text-base text-[#212121] mb-6">{selectedProject.description}</p>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Design Highlights</h3>
              <ul className="list-none p-0 mb-6 text-left">
                {selectedProject.designHighlights.map((highlight, i) => (
                  <li key={i} className="bg-[#f0f4f8] border-l-4 border-[#00bcd4] p-3 mb-2 rounded text-base text-[#212121]">
                    {highlight}
                  </li>
                ))}
              </ul>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Technologies Used</h3>
              <div className="flex flex-wrap gap-2 mb-6 justify-start">
                {selectedProject.technologies.map((tech, i) => (
                  <span key={i} className="bg-[#00bcd4] text-white px-4 py-2 rounded-full text-sm font-semibold">
                    {tech}
                  </span>
                ))}
              </div>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">About the Freelancer</h3>
              <div className="flex items-center gap-5 mb-8">
                <img
                  src={selectedProject.freelancerAvatar}
                  alt={selectedProject.freelancerName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#9c27b0] shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
                />
                <div>
                  <h4 className="font-montserrat font-bold text-xl text-[#6a1b9a] m-0">{selectedProject.freelancerName}</h4>
                  <p className="text-sm text-[#757575] mt-1 mb-0">{selectedProject.freelancerBio}</p>
                </div>
              </div>
              <div className="border-t border-[#e0e0e0] pt-6 flex flex-col md:flex-row justify-between items-center gap-5 mt-8">
                <span className="text-3xl font-bold text-[#00bcd4]">${selectedProject.price}</span>
                <button
                  className={`bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full md:w-auto ${bookedProjects[selectedProject.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`}
                  onClick={() => handleBookProject(selectedProject)}
                  disabled={bookedProjects[selectedProject.id]}
                >
                  {bookedProjects[selectedProject.id] ? 'Booked' : 'Book Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {activeModal === 'editProfileModal' && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto relative p-8">
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a] mb-6 text-center">Edit Profile</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={editProfile.name}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Company</label>
                <input
                  type="text"
                  name="company"
                  value={editProfile.company}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter your company"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={editProfile.bio}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  rows="4"
                  placeholder="Enter your bio"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Avatar URL</label>
                <input
                  type="url"
                  name="avatar"
                  value={editProfile.avatar}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter avatar URL"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Website URL</label>
                <input
                  type="url"
                  name="website"
                  value={editProfile.website}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter website URL"
                />
              </div>
              <button
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full"
                onClick={handleEditProfile}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {activeModal === 'chatModal' && selectedFreelancer && (
        <ChatModal client={clientData} freelancer={selectedFreelancer} onClose={closeModal} />
      )}
    </div>
  );
}

// -------------------------
// File: frontend\app\clientId\client\page.jsx
// -------------------------

'use client';

import React, { useState } from 'react';
import { FaUserCircle, FaArrowRight, FaTimes, FaEnvelope, FaHome, FaProjectDiagram, FaInbox, FaPlus, FaEdit } from 'react-icons/fa';
import ChatModal from '../../../component/page';

// Mock initial client data
const initialClientData = {
  name: 'John Doe',
  company: 'TechStartup Inc.',
  bio: 'Founder of TechStartup Inc., focused on innovative SaaS solutions. Looking for talented UX/UI designers to bring our vision to life.',
  avatar: 'https://randomuser.me/api/portraits/men/50.jpg',
  website: 'https://techstartup.com',
};

// Mock projects data (booked or interested projects)
const initialProjectsData = [
  {
    id: '1',
    title: 'SaaS Product Landing Page',
    freelancerName: 'Anya Sharma',
    freelancerBio: 'UX/UI Designer with 7+ years of experience specializing in web applications and SaaS platforms. Passionate about user-centric design, creating intuitive and beautiful interfaces.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    price: '1200',
    image: 'https://source.unsplash.com/random/800x600/?saas-landing-page,web-design',
    description: 'A sleek, conversion-optimized landing page designed for a new SaaS product. This project focused on clear value proposition, engaging animations, and seamless call-to-actions to maximize user engagement. Delivered with fully responsive designs for desktop and mobile, ensuring optimal viewing across all devices.',
    designHighlights: [
      'Modern, minimalist aesthetic',
      'Intuitive navigation and user flow',
      'Optimized for high conversion rates',
      'Custom vector iconography and illustrations',
      'Consistent brand storytelling',
    ],
    technologies: ['Figma', 'HTML5', 'CSS3 (SCSS)', 'JavaScript (React)', 'Webflow'],
  },
];

// Mock inquiries data (freelancers contacted)
const inquiriesData = [
  {
    id: '1',
    freelancerName: 'Anya Sharma',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    message: 'Thanks for reaching out! I’m excited to discuss your SaaS landing page project.',
    timestamp: '2025-07-20 14:35',
    portfolio: 'https://anyasharma.design',
  },
  {
    id: '2',
    freelancerName: 'Michael Lee',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/65.jpg',
    message: 'Your project sounds interesting! Can we discuss the scope and timeline?',
    timestamp: '2025-07-19 10:00',
    portfolio: 'https://michaellee.design',
  },
];

export default function ClientDashboard() {
  const [clientData, setClientData] = useState(initialClientData);
  const [projectsData, setProjectsData] = useState(initialProjectsData);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [bookedProjects, setBookedProjects] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const [activeSection, setActiveSection] = useState('inquiries');
  const [editProfile, setEditProfile] = useState({
    name: clientData.name,
    company: clientData.company,
    bio: clientData.bio,
    avatar: clientData.avatar,
    website: clientData.website,
  });

  const openModal = (modalType, project = null, freelancer = null) => {
    setSelectedProject(project);
    setSelectedFreelancer(freelancer);
    setActiveModal(modalType);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedProject(null);
    setSelectedFreelancer(null);
    setEditProfile({
      name: clientData.name,
      company: clientData.company,
      bio: clientData.bio,
      avatar: clientData.avatar,
      website: clientData.website,
    });
    document.body.style.overflow = '';
  };

  const handleBookProject = (project) => {
    if (bookedProjects[project.id]) {
      alert('This project is already booked!');
      return;
    }
    if (confirm(`Are you sure you want to book "${project.title}" from ${project.freelancerName}?`)) {
      setTimeout(() => {
        alert(`Success! Your booking request for "${project.title}" has been sent to ${project.freelancerName}.`);
        setBookedProjects({ ...bookedProjects, [project.id]: true });
        closeModal();
      }, 500);
    } else {
      alert('Booking cancelled.');
    }
  };

  const handleEditProfile = (e) => {
    e.preventDefault();
    if (!editProfile.name || !editProfile.company || !editProfile.bio || !editProfile.avatar || !editProfile.website) {
      alert('Please fill in all fields.');
      return;
    }
    setClientData(editProfile);
    alert('Profile updated successfully!');
    closeModal();
  };

  const handleInputChange = (e, setState) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <section id="home" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] flex flex-col items-center justify-center">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4 text-center">Welcome, {clientData.name}!</h2>
            <p className="text-lg text-[#757575] mb-6 text-center max-w-[600px]">
              Connect with talented freelancers and manage your projects seamlessly. Check your inquiries or explore booked projects to get started.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setActiveSection('projects')}
                className="bg-[#00bcd4] text-white px-6 py-3 rounded-full font-semibold text-base inline-flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all"
              >
                View Projects <FaProjectDiagram />
              </button>
              <button
                onClick={() => setActiveSection('inquiries')}
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                View Inquiries <FaInbox />
              </button>
            </div>
          </section>
        );
      case 'projects':
        return (
          <section id="projects" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Your Projects</h2>
            </div>
            <div className="space-y-8">
              {projectsData.length > 0 ? (
                projectsData.map(project => (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all flex flex-col md:flex-row overflow-hidden"
                    onClick={() => openModal('projectDetailModal', project)}
                  >
                    <div className="md:w-1/3 bg-[#f0f4f8] p-6 flex flex-col items-center md:items-start text-center md:text-left">
                      <img
                        src={project.freelancerAvatar}
                        alt={project.freelancerName}
                        className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] mb-4"
                      />
                      <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a] mb-2">{project.freelancerName}</h3>
                      <p className="text-sm text-[#757575] mb-4">{project.freelancerBio}</p>
                    </div>
                    <div className="md:w-2/3 p-6 flex flex-col">
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-[200px] object-cover rounded-lg mb-4 border border-[#e0e0e0]"
                      />
                      <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{project.title}</h3>
                      <p className="text-base text-[#757575] mb-4 flex-grow">{project.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="bg-[#00bcd4] text-white px-3 py-1 rounded-full text-sm font-semibold">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-[#e0e0e0]">
                        <span className="text-2xl font-bold text-[#00bcd4]">${project.price}</span>
                        <span
                          className={`px-4 py-2 rounded-full font-semibold text-sm ${bookedProjects[project.id] ? 'bg-[#ccc] text-[#212121]' : 'bg-[#e0f7fa] text-[#00bcd4]'}`}
                        >
                          {bookedProjects[project.id] ? 'Booked' : 'Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#757575] text-lg">No projects booked yet. Explore freelancers to get started!</p>
              )}
            </div>
          </section>
        );
      case 'inquiries':
        return (
          <section id="inquiries" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Freelancer Inquiries</h2>
              <span className="text-sm text-[#757575]">{inquiriesData.length} Inquiries</span>
            </div>
            <div className="overflow-y-auto overflow-x-hidden max-h-[calc(100vh-160px)] space-y-6">
              {inquiriesData.length > 0 ? (
                inquiriesData.map(freelancer => (
                  <div
                    key={freelancer.id}
                    className="flex items-center gap-4 p-4 bg-[#f0f4f8] rounded-lg hover:bg-[#e0f7fa] transition-colors"
                  >
                    <img
                      src={freelancer.freelancerAvatar}
                      alt={freelancer.freelancerName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#9c27b0]"
                    />
                    <div className="flex-grow">
                      <h4 className="font-montserrat font-bold text-lg text-[#6a1b9a] mb-1">{freelancer.freelancerName}</h4>
                      <p className="text-sm text-[#757575] mb-1 line-clamp-2">{freelancer.message}</p>
                      <p className="text-xs text-[#9e9e9e] m-0">Received: {freelancer.timestamp}</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={freelancer.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#00bcd4] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 transition-all"
                      >
                        View Profile <FaArrowRight />
                      </a>
                      <button
                        className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all"
                        onClick={() => openModal('chatModal', null, freelancer)}
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#757575] text-lg">No freelancer inquiries yet.</p>
              )}
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="font-sans text-[#212121] leading-relaxed bg-[#f5f5f5] min-h-screen">
      {/* Header */}
      <header className="bg-white py-4 shadow-[0_2px_10px_rgba(0,0,0,0.08)] sticky top-0 z-[1000]">
        <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-center">
          <div className="text-3xl font-bold text-[#6a1b9a]">
            <a href="/" className="text-inherit no-underline">CreativeHub</a>
          </div>
          <nav className="md:hidden">
            <button
              className="text-[#757575] text-2xl"
              onClick={() => setActiveSection(activeSection === 'home' ? 'inquiries' : 'home')}
            >
              <FaUserCircle />
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar (30%) */}
          <aside className="lg:w-[30%] bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-6 sticky top-20 h-[calc(100vh-80px)] flex flex-col">
            <div className="flex flex-col items-center text-center mb-8">
              <img
                src={clientData.avatar}
                alt={clientData.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] shadow-[0_2px_10px_rgba(0,0,0,0.1)] mb-4"
              />
              <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{clientData.name}</h2>
              <p className="text-lg text-[#757575] mb-2">{clientData.company}</p>
              <p className="text-sm text-[#757575] mb-4">{clientData.bio}</p>
              <div className="flex flex-col gap-3 w-full">
                <a
                  href={clientData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#00bcd4] text-white px-6 py-3 rounded-full font-semibold text-base inline-flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all justify-center"
                >
                  View Website <FaArrowRight />
                </a>
                <button
                  className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all flex items-center gap-2 justify-center"
                  onClick={() => openModal('editProfileModal')}
                >
                  Edit Profile <FaEdit />
                </button>
              </div>
            </div>
            <nav className="space-y-4 mt-auto">
              <button
                onClick={() => setActiveSection('home')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'home' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaHome /> Home
              </button>
              <button
                onClick={() => setActiveSection('projects')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'projects' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaProjectDiagram /> Projects
              </button>
              <button
                onClick={() => setActiveSection('inquiries')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'inquiries' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaInbox /> Inquiries
              </button>
            </nav>
          </aside>

          {/* Right Content (70%) */}
          <div className="lg:w-[70%]">{renderSection()}</div>
        </div>
      </main>

      {/* Project Detail Modal */}
      {activeModal === 'projectDetailModal' && selectedProject && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[900px] max-h-[90vh] overflow-y-auto relative transform translate-y-0 transition-transform">
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            <div className="w-full h-[350px] overflow-hidden border-b border-[#e0e0e0]">
              <img src={selectedProject.image} alt={selectedProject.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-8 text-center">
              <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4">{selectedProject.title}</h2>
              <p className="text-base text-[#212121] mb-6">{selectedProject.description}</p>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Design Highlights</h3>
              <ul className="list-none p-0 mb-6 text-left">
                {selectedProject.designHighlights.map((highlight, i) => (
                  <li key={i} className="bg-[#f0f4f8] border-l-4 border-[#00bcd4] p-3 mb-2 rounded text-base text-[#212121]">
                    {highlight}
                  </li>
                ))}
              </ul>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Technologies Used</h3>
              <div className="flex flex-wrap gap-2 mb-6 justify-start">
                {selectedProject.technologies.map((tech, i) => (
                  <span key={i} className="bg-[#00bcd4] text-white px-4 py-2 rounded-full text-sm font-semibold">
                    {tech}
                  </span>
                ))}
              </div>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">About the Freelancer</h3>
              <div className="flex items-center gap-5 mb-8">
                <img
                  src={selectedProject.freelancerAvatar}
                  alt={selectedProject.freelancerName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#9c27b0] shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
                />
                <div>
                  <h4 className="font-montserrat font-bold text-xl text-[#6a1b9a] m-0">{selectedProject.freelancerName}</h4>
                  <p className="text-sm text-[#757575] mt-1 mb-0">{selectedProject.freelancerBio}</p>
                </div>
              </div>
              <div className="border-t border-[#e0e0e0] pt-6 flex flex-col md:flex-row justify-between items-center gap-5 mt-8">
                <span className="text-3xl font-bold text-[#00bcd4]">${selectedProject.price}</span>
                <button
                  className={`bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full md:w-auto ${bookedProjects[selectedProject.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`}
                  onClick={() => handleBookProject(selectedProject)}
                  disabled={bookedProjects[selectedProject.id]}
                >
                  {bookedProjects[selectedProject.id] ? 'Booked' : 'Book Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {activeModal === 'editProfileModal' && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto relative p-8">
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a] mb-6 text-center">Edit Profile</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={editProfile.name}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Company</label>
                <input
                  type="text"
                  name="company"
                  value={editProfile.company}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter your company"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={editProfile.bio}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  rows="4"
                  placeholder="Enter your bio"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Avatar URL</label>
                <input
                  type="url"
                  name="avatar"
                  value={editProfile.avatar}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter avatar URL"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Website URL</label>
                <input
                  type="url"
                  name="website"
                  value={editProfile.website}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter website URL"
                />
              </div>
              <button
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full"
                onClick={handleEditProfile}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {activeModal === 'chatModal' && selectedFreelancer && (
        <ChatModal client={clientData} freelancer={selectedFreelancer} onClose={closeModal} />
      )}
    </div>
  );
}

// -------------------------
// File: frontend\app\discover\page.jsx
// -------------------------

'use client';

import React, { useState } from 'react';
import { FaUserCircle, FaArrowRight, FaTimes } from 'react-icons/fa';

const projectsData = [
  {
    id: '1',
    title: 'SaaS Product Landing Page',
    freelancerName: 'Anya Sharma',
    freelancerBio: 'UX/UI Designer with 7+ years of experience specializing in web applications and SaaS platforms. Passionate about user-centric design, creating intuitive and beautiful interfaces.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    price: '1200',
    image: 'https://source.unsplash.com/random/800x600/?saas-landing-page,web-design',
    description: 'A sleek, conversion-optimized landing page designed for a new SaaS product. This project focused on clear value proposition, engaging animations, and seamless call-to-actions to maximize user engagement. Delivered with fully responsive designs for desktop and mobile, ensuring optimal viewing across all devices.',
    designHighlights: [
      'Modern, minimalist aesthetic',
      'Intuitive navigation and user flow',
      'Optimized for high conversion rates',
      'Custom vector iconography and illustrations',
      'Consistent brand storytelling'
    ],
    technologies: ['Figma', 'HTML5', 'CSS3 (SCSS)', 'JavaScript (React)', 'Webflow']
  },
  {
    id: '2',
    title: 'E-commerce Mobile App UI/UX',
    freelancerName: 'David Lee',
    freelancerBio: 'Mobile UI/UX expert with a focus on creating delightful and efficient user experiences for iOS and Android applications. I prioritize user research and testing to deliver truly impactful designs.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    price: '950',
    image: 'https://source.unsplash.com/random/800x600/?ecommerce-app,mobile-ui',
    description: 'A complete UI/UX design for a modern e-commerce mobile application. This comprehensive project includes detailed user flows, wireframes, high-fidelity mockups, and interactive prototypes for both iOS and Android platforms. Designed for a seamless and intuitive shopping experience, from browsing to checkout.',
    designHighlights: [
      'Smooth and fast checkout flow',
      'Personalized product recommendations engine',
      'Integrated dark mode compatibility',
      'Delicate animated transitions for engagement',
      'Accessibility-first design principles'
    ],
    technologies: ['Adobe XD', 'Sketch', 'Principle', 'Material Design', 'Human Interface Guidelines']
  },
  {
    id: '3',
    title: 'Complete Brand Identity & Logo',
    freelancerName: 'Chloe Kim',
    freelancerBio: 'Brand strategist and graphic designer dedicated to crafting unique and memorable brand identities that resonate with target audiences. My passion is building brands from the ground up.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/67.jpg',
    price: '1800',
    image: 'https://source.unsplash.com/random/800x600/?branding,logo-design',
    description: 'A comprehensive brand identity package covering logo design, typography, color palette, brand guidelines, and supporting visual assets. This project aims to create a strong, cohesive, and impactful brand presence for a new startup.',
    designHighlights: [
      'Unique and scalable logo mark',
      'Versatile brand guidelines documentation',
      'Custom typography pairings',
      'Strategic color psychology application',
      'Brand mood board and visual direction'
    ],
    technologies: ['Adobe Illustrator', 'Adobe Photoshop', 'InDesign', 'Procreate (for initial sketches)']
  },
  {
    id: '4',
    title: 'Custom Digital Character Art',
    freelancerName: 'Omar Hassan',
    freelancerBio: 'Digital artist specializing in character design for games, animation, and print. I bring characters to life with distinct personalities and vibrant aesthetics.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/29.jpg',
    price: '700',
    image: 'https://source.unsplash.com/random/800x600/?illustration,digital-art',
    description: 'Creation of a unique digital character, suitable for various media. This includes concept sketches, character sheet with different poses/expressions, and high-resolution final artwork. Perfect for mascots, game characters, or storytelling.',
    designHighlights: [
      'Expressive character poses',
      'Detailed texture and lighting',
      'Dynamic color schemes',
      'Multiple outfit/expression variations'
    ],
    technologies: ['Procreate', 'Clip Studio Paint', 'Adobe Photoshop']
  },
  {
    id: '5',
    title: 'Short Explainer Video & Motion Graphics',
    freelancerName: 'Sara Khan',
    freelancerBio: 'Motion graphics designer and video editor focused on creating engaging visual stories. I transform complex ideas into compelling and digestible animated content.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/79.jpg',
    price: '1500',
    image: 'https://source.unsplash.com/random/800x600/?video-editing,motion-graphics',
    description: 'A captivating 60-90 second explainer video with custom motion graphics to clearly articulate a product or service. Includes scriptwriting, voiceover, custom animation, and sound design. Ideal for marketing campaigns and website hero sections.',
    designHighlights: [
      'Engaging visual storytelling',
      'Smooth and professional animations',
      'Custom character and object designs',
      'Crystal clear audio and voiceover'
    ],
    technologies: ['Adobe After Effects', 'Adobe Premiere Pro', 'Illustrator', 'Audacity']
  },
  {
    id: '6',
    title: 'SEO-Optimized Blog Content Package',
    freelancerName: 'Liam Gallagher',
    freelancerBio: 'Content writer and SEO specialist passionate about crafting compelling narratives that rank high and convert. I combine creativity with data-driven strategies to deliver results.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/8.jpg',
    price: '600',
    image: 'https://source.unsplash.com/random/800x600/?copywriting,blog',
    description: 'A package of 5 SEO-optimized blog articles (800-1000 words each) tailored to your industry and keywords. Includes topic research, keyword integration, competitive analysis, and compelling calls-to-action. Designed to boost organic traffic and establish thought leadership.',
    designHighlights: [
      'In-depth keyword research',
      'Engaging and informative writing style',
      'Structurally optimized for readability',
      'Strong calls-to-action (CTAs)',
      'Original, plagiarism-free content'
    ],
    technologies: ['Ahrefs', 'Surfer SEO', 'Google Analytics', 'Grammarly']
  },
  {
    id: '7',
    title: 'E-commerce Product Photography',
    freelancerName: 'Nina Petrov',
    freelancerBio: 'Product photographer with an eye for detail and a knack for making products shine. I create high-quality, conversion-focused images for online stores and marketing materials.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/51.jpg',
    price: '850',
    image: 'https://source.unsplash.com/random/800x600/?photography,product',
    description: 'Professional product photography session for e-commerce. Includes studio setup, lighting, high-resolution shots from multiple angles, and post-production editing. Delivers images optimized for web use, ready to upload to your online store.',
    designHighlights: [
      'Sharp, clear imagery',
      'Consistent branding through visuals',
      'Optimal lighting for product details',
      'Clean, distraction-free backgrounds',
      'Web-optimized file sizes'
    ],
    technologies: ['Canon DSLR/Mirrorless', 'Adobe Lightroom', 'Adobe Photoshop', 'Studio Lighting Equipment']
  },
  {
    id: '8',
    title: 'Custom Web Application Development',
    freelancerName: 'Kenji Tanaka',
    freelancerBio: 'Full-stack developer with 10+ years experience building robust and scalable web applications. I focus on clean code and efficient solutions.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/66.jpg',
    price: '3000',
    image: 'https://source.unsplash.com/random/800x600/?web-development,custom-app',
    description: 'Development of a custom web application tailored to specific business needs. This service covers front-end and back-end development, database integration, and API creation. Ideal for unique software solutions or internal tools.',
    designHighlights: [
      'Scalable architecture',
      'Secure data handling',
      'User-friendly interface (UX-focused development)',
      'Cross-browser compatibility',
      'Optimized performance'
    ],
    technologies: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'Python (Django/Flask)', 'AWS']
  },
  {
    id: '9',
    title: 'Professional Business Brochure Design',
    freelancerName: 'Isabella Rossi',
    freelancerBio: 'Print and digital designer specializing in marketing collateral. I create impactful visual communication pieces that capture attention and convey messages effectively.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    price: '500',
    image: 'https://source.unsplash.com/random/800x600/?print-design,brochure',
    description: 'Design of a professional, eye-catching business brochure (tri-fold, bi-fold, or custom). Includes content layout, image selection/editing, and print-ready file delivery. Perfect for trade shows, sales kits, or corporate presentations.',
    designHighlights: [
      'Compelling visual hierarchy',
      'High-quality imagery and graphics',
      'Effective call-to-action placement',
      'Print-ready PDF with bleed and crop marks',
      'Branded and cohesive design elements'
    ],
    technologies: ['Adobe InDesign', 'Adobe Photoshop', 'Adobe Illustrator', 'Canva Pro (for quick mockups)']
  }
];

export default function DiscoverPage() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [bookedProjects, setBookedProjects] = useState({});
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (project) => {
    setSelectedProject(project);
    setActiveModal('projectDetailModal');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setActiveModal(null);
    document.body.style.overflow = '';
  };

  const handleBookProject = (project) => {
    if (bookedProjects[project.id]) {
      alert('This project is already booked!');
      return;
    }
    if (confirm(`Are you sure you want to book "${project.title}" from ${project.freelancerName}?`)) {
      setTimeout(() => {
        alert(`Success! Your booking request for "${project.title}" has been sent. The freelancer will contact you shortly.`);
        setBookedProjects({ ...bookedProjects, [project.id]: true });
        closeModal();
      }, 500);
    } else {
      alert('Booking cancelled.');
    }
  };

  return (
    <div className="font-sans text-[#212121] leading-relaxed bg-[#f5f5f5] min-h-screen">
      {/* Header */}
      <header className="bg-white py-4 shadow-[0_2px_10px_rgba(0,0,0,0.08)] sticky top-0 z-[1000]">
        <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-center">
          <div className="text-3xl font-bold text-[#6a1b9a]">
            <a href="/" className="text-inherit no-underline">CreativeHub</a>
          </div>
          <nav className="hidden md:flex md:items-center">
            <ul className="flex flex-row">
              <li className="mr-8">
                <a href="/" className="text-[#757575] font-semibold text-base hover:text-[#6a1b9a]">Home</a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <h1 className="font-montserrat font-bold text-4xl text-[#6a1b9a] text-center mb-5">Discover Creative Projects</h1>
          <p className="text-lg text-[#757575] text-center mb-12 max-w-[700px] mx-auto">Explore a curated selection of projects from our global community of talented freelancers.</p>
          <div className="space-y-8">
            {projectsData.map(project => (
              <div
                key={project.id}
                className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all flex flex-col md:flex-row overflow-hidden"
                onClick={() => openModal(project)}
              >
                {/* Developer Info (Left) */}
                <div className="md:w-1/3 bg-[#f0f4f8] p-6 flex flex-col items-center md:items-start text-center md:text-left">
                  <img
                    src={project.freelancerAvatar}
                    alt={project.freelancerName}
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] mb-4"
                  />
                  <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a] mb-2">{project.freelancerName}</h3>
                  <p className="text-sm text-[#757575] mb-4">{project.freelancerBio}</p>
                </div>
                {/* Project Info (Right) */}
                <div className="md:w-2/3 p-6 flex flex-col">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-[200px] object-cover rounded-lg mb-4 border border-[#e0e0e0]"
                  />
                  <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{project.title}</h2>
                  <p className="text-base text-[#757575] mb-4 flex-grow">{project.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.technologies.map((tech, i) => (
                      <span key={i} className="bg-[#00bcd4] text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-[#e0e0e0]">
                    <span className="text-2xl font-bold text-[#00bcd4]">${project.price}</span>
                    <button
                      className={`bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all ${bookedProjects[project.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookProject(project);
                      }}
                      disabled={bookedProjects[project.id]}
                    >
                      {bookedProjects[project.id] ? 'Booked!' : 'Book Now'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Project Detail Modal */}
      {activeModal === 'projectDetailModal' && selectedProject && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[900px] max-h-[90vh] overflow-y-auto relative transform translate-y-0 transition-transform">
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            <div className="w-full h-[350px] overflow-hidden border-b border-[#e0e0e0]">
              <img src={selectedProject.image} alt={selectedProject.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-8 text-center">
              <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4">{selectedProject.title}</h2>
              <p className="text-base text-[#212121] mb-6">{selectedProject.description}</p>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Design Highlights</h3>
              <ul className="list-none p-0 mb-6 text-left">
                {selectedProject.designHighlights.map((highlight, i) => (
                  <li key={i} className="bg-[#f0f4f8] border-l-4 border-[#00bcd4] p-3 mb-2 rounded text-base text-[#212121]">
                    {highlight}
                  </li>
                ))}
              </ul>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Technologies Used</h3>
              <div className="flex flex-wrap gap-2 mb-6 justify-start">
                {selectedProject.technologies.map((tech, i) => (
                  <span key={i} className="bg-[#00bcd4] text-white px-4 py-2 rounded-full text-sm font-semibold">
                    {tech}
                  </span>
                ))}
              </div>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">About the Creator</h3>
              <div className="flex items-center gap-5 mb-8">
                <img
                  src={selectedProject.freelancerAvatar}
                  alt={selectedProject.freelancerName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#9c27b0] shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
                />
                <div>
                  <h4 className="font-montserrat font-bold text-xl text-[#6a1b9a] m-0">{selectedProject.freelancerName}</h4>
                  <p className="text-sm text-[#757575] mt-1 mb-0">{selectedProject.freelancerBio}</p>
                </div>
              </div>
              <div className="border-t border-[#e0e0e0] pt-6 flex flex-col md:flex-row justify-between items-center gap-5 mt-8">
                <span className="text-3xl font-bold text-[#00bcd4]">${selectedProject.price}</span>
                <button
                  className={`bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full md:w-auto ${bookedProjects[selectedProject.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`}
                  onClick={() => handleBookProject(selectedProject)}
                  disabled={bookedProjects[selectedProject.id]}
                >
                  {bookedProjects[selectedProject.id] ? 'Booked!' : 'Book This Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------
// File: frontend\app\favicon.ico
// -------------------------

         (  F          (  n  00     (-  �         �  �F  (                                                           $   ]   �   �   ]   $                                       �   �   �   �   �   �   �   �                           8   �   �   �   �   �   �   �   �   �   �   8                  �   �   �   �   �   �   �   �   �   �   �   �              �   �   �   �   �   �   �   �   �   �   �   �   �   �       #   �   �   �OOO�������������������������ggg�   �   �   �   #   Y   �   �   ��������������������������555�   �   �   �   Y   �   �   �   �   �kkk���������������������   �   �   �   �   �   �   �   �   �   �			������������������   �   �   �   �   �   Y   �   �   �   �   �JJJ���������kkk�   �   �   �   �   �   Y   #   �   �   �   �   ����������			�   �   �   �   �   �   #       �   �   �   �   �   �111�DDD�   �   �   �   �   �   �              �   �   �   �   �   �   �   �   �   �   �   �                  8   �   �   �   �   �   �   �   �   �   �   8                           �   �   �   �   �   �   �   �                                       $   ]   �   �   ]   $                                                                                                                                                                                                                                                                                    (       @                                                                               ,   U   �   �   �   �   U   ,                                                                                      *   �   �   �   �   �   �   �   �   �   �   �   �   *                                                                      �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                          Q   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   Q                                               r   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   r                                       r   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   r                               O   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   O                          �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                      �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �               (   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   '           �   �   �   �   �   �   �888���������������������������������������������������������___�   �   �   �   �   �   �   �          �   �   �   �   �   �   ����������������������������������������������������������SSS�   �   �   �   �   �   �   �      +   �   �   �   �   �   �   �   �hhh�����������������������������������������������������   �   �   �   �   �   �   �   �   +   T   �   �   �   �   �   �   �   ��������������������������������������������������,,,�   �   �   �   �   �   �   �   �   T   �   �   �   �   �   �   �   �   �   �GGG���������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �+++���������������������������������jjj�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ����������������������������������   �   �   �   �   �   �   �   �   �   �   �   T   �   �   �   �   �   �   �   �   �   �   ��������������������������III�   �   �   �   �   �   �   �   �   �   �   �   T   +   �   �   �   �   �   �   �   �   �   �   �   �hhh����������������������   �   �   �   �   �   �   �   �   �   �   �   +      �   �   �   �   �   �   �   �   �   �   �   ������������������,,,�   �   �   �   �   �   �   �   �   �   �   �   �          �   �   �   �   �   �   �   �   �   �   �   �   �GGG�������������   �   �   �   �   �   �   �   �   �   �   �   �   �           '   �   �   �   �   �   �   �   �   �   �   �   �   ����������   �   �   �   �   �   �   �   �   �   �   �   �   (               �   �   �   �   �   �   �   �   �   �   �   �   �333�___�   �   �   �   �   �   �   �   �   �   �   �   �   �                      �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                          O   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   O                               r   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   r                                       r   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   r                                               Q   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   Q                                                          �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                                      *   �   �   �   �   �   �   �   �   �   �   �   �   *                                                                                      ,   U   �   �   �   �   U   ,                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               (   0   `           -                                                                                             	   (   L   j   �   �   �   �   j   K   (   	                                                                                                                                          V   �   �   �   �   �   �   �   �   �   �   �   �   �   �   U                                                                                                                      %   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   &                                                                                                      �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                                                          Q   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   R                                                                              �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                                     �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                             �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                     �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                              �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                       P   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   O                                  �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                              �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                       #   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   #                   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                  �   �   �   �   �   �   �   �   �   �$$$�hhh�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�PPP��   �   �   �   �   �   �   �   �   �              U   �   �   �   �   �   �   �   �   �   ������������������������������������������������������������������������������������������sss�   �   �   �   �   �   �   �   �   �   �   U           �   �   �   �   �   �   �   �   �   �   �   �eee��������������������������������������������������������������������������������������   �   �   �   �   �   �   �   �   �   �   �       	   �   �   �   �   �   �   �   �   �   �   �   ����������������������������������������������������������������������������������HHH�   �   �   �   �   �   �   �   �   �   �   �   �   	   (   �   �   �   �   �   �   �   �   �   �   �   �   �EEE�����������������������������������������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   (   K   �   �   �   �   �   �   �   �   �   �   �   �   �   �������������������������������������������������������������������������,,,�   �   �   �   �   �   �   �   �   �   �   �   �   �   L   j   �   �   �   �   �   �   �   �   �   �   �   �   �   �)))���������������������������������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   j   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ������������������������������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ����������������������������������������������������������iii�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �eee������������������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ��������������������������������������������������HHH�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   j   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �EEE���������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   j   L   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �����������������������������������������,,,�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   K   (   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �)))�������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   (   	   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ����������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   	       �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ��������������������������iii�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �           U   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �eee����������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   U              �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ������������������HHH�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                  �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �EEE�������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                   #   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ���������,,,�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   #                       �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �222�}}}�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                              �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                  O   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   P                                       �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                              �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                     �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                             �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                                     �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                                              R   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   Q                                                                                          �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                                                                      &   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   %                                                                                                                      U   �   �   �   �   �   �   �   �   �   �   �   �   �   �   V                                                                                                                                          	   (   K   j   �   �   �   �   j   L   (   	                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        �PNG

   
IHDR         \r�f   sRGB ���   8eXIfMM *    �i            �       �           D"8s  IDATx�]	�ՙn�]<QVA���h$	�N��13*�q��d�č�I���D�L2��(�(Ԙ2�ę�G	��q_@屈���xț�Џ��{o�������U�{}�O��;������9�d���(Dg��8	��N �]��@�hx�?v 
�N�3�=`;�6�.�&��u��  ��6�P��н��@�àR� P�iZq�^DN���wp�
���X�hИHg@��
:��|�5` p"@�'�ɲ�s{
�p�*�2����� d ү���|(0�
0 ��>K�
�xX�6 IJ� �C|?$KEN�}ϓ|������h $	2 ��|/� . Nz �#���W�e�
�5��
����ܶ���;�y �� �g�s�h^  I�� DL(�;�8��Hjg�cH|x�1��R"�a���Ӂ� G��@��9`/`%0�
H�@j�~,���K
�,t).��I���D�T�O�)~��V�u$b 誛
�U%�7������ _�$b 8A������J�3` 510wQ�?��vr���:�2�K�@ ��v*{%#��A�Z�咁^(��=�g \��W�����!:��,`�6��643�:@�c.Fٟ����u?�<��'������_܏vp: �8Q��
I�Ł�
p{3���kHȢ�G�����c�Ѽ
<�62&�
��2uC�����敭��T�3�
��
���;���d�/~m��.��X�@{�w.��d]G�� {lK��Eb���(P�RuM�T�C����
�d��])��_Lm�=��=@b���K��GUk�^�U�������)1����g�T���m`9�\����Q��@����Ⱆ6�:ڞ�^�w�����E�D�� �	�5����F�,��
�X"�d�m�<�nB~��@����t�t�x��
�;�f�>����I8����8��C1۪$B���e���+��jl��EZ��& ��S:�:�6�m����\G1��`���!�nl�l�Ɗ�^�Q`��@Oc�S��@e�ͷ���qb�p���S��@up���F�D@�Г������2@#����L3 �A��$H2� _h��FH#rq(��O�D�򤬈���runGOWa�b� &�SgD�3�ED�to�*Ǥ����9k��~)���,$� x�R�1�v�K ��9�D䍁U(�w�&LE��ꩻ�S)��3�Y8x8 $.i�(��K�ŀY����a�]����4��ǀ	c����@3�f����4� Ƣ��
�/*b��� ���$!I�~��7�B*-1`	o � �	�$��ǡD�����L������ �J"���OQ��)��2@#�x4�"$e ���I�8��Oi��8�"� �G��8[x�t<�.��7&�m&؎R�^��tq� ؕ�.���Y�-2� �d� ��*_��&d|j\�W�b ��G����*g�� ��釁�F4�"I�؃�/ b1q�N����Y�D��p���9���p�}w\� �Ԥ���1 j`��O���xK=��H�� �A��1
�#�
D:U8j���t���$b b�A||�U�Q��26%��)1 ��_
�ꢳ!~D��� ��+b >A��:]�E$��50��GDhR�t����ݻwR�)��P� ��n$� 3���@bS�Nu�,Y�j�ʲ��:����;�����@�`�|�-[)�'OV��Ն�sFxڮ��ۥ�n}͛7�����~��ƺ�:���Q��J_��UKj8�q0x���;v4 ̞=[�hW=�	��	�&�!e5�8hѢE��w�]�����6���_�iW}�SZ�?	�/`�;vl�}��2 <�h�" ����A�܁�X,�m۶�+V�(��<�w���#F�^���;���aH�c ���)S�*�{a���p��c89(�^����4�&E��oÆ
��W�/��u�=�^���*?{k^�_E�����z���g�� UI-���{WU*
�:p�9.tڷo(/ݺus>��3�'�^�Rg���ڞG��I_D�������~~� ��{
���?N0�7�S��.ƍ׸�~?}/y]nA;�أ���2 ]�FOB2C?�_I����[�:�:�=#�OzK�-� ��ϣ�%����?j��I���P�ۯ��{N�-hU��t�:������� ,���G�K�-hU���c�hP7 ����@�n?�\�-�k�.���2�:�� �`��F��=�-�V�_�G��܂V� ��}�0 WI����F��ʭ���sM�rZ�8pJ�Q�*@OK8���
rZ��ݖa, ��w� �S�W^y����.��5�at7��ݏ���Tv#�~7n��A"�����+��W��pM��/�hK8����g��F/^������M{e ��R�|�)q��7�t��?8'���K��P~���瞰�\��r��>�ǷUk �eP��|�^x����
�/V/��v���������*�p�v�� ����ʟ]J��}��k8(������ĉ�ѣGǗ�O�mڴq,X�o���e.�^ �Qx���p�t����4^_�N�{�����y�2 �s����� �-عsg�s���i�v��Z
8
!~PJ?�c�������|�] �ܽ{��z�긓R��1pn���z�����tlp�9�f�r�v�jT殿�z�4*O�L�~����ԕ3��4�~~�r�;�m�xY�+���������3 r�;�m�x�4���:7]ՁqL�4)U��!r�1��u�6���$�
�7����8�w��̙3Ǹ|5�>?�\z��O���͆� ��,�E����3�����2���[����2Wu:E�����^p.H1cJ�t�]}��B�u��SOu�����Ic�O�����%� 
 �AZ������k����D?�5 �@Q��
���3�w�+��"��T��S��Uޥ�13��?��5 M'݋��>p��Z�j�~fj�
׈�סԐ�n�����>� ��i5D�[bf ��~a�'�`Xc��� -�1�k����āI�������k��Q�ů|�k�M��(92�@�t�����݂X-�Lדa��N4��qܞ'$f0@�
@V�nA�ܘY�L9:�|/^s� ��	��)0`�j��T\w�uZ-����¨\�	@�:��c�t���{�-��Rb��1%� �I,Y%T���~��r�1����C��,�$��*ˀ���f<��0z����h�F���� ����|���8Z-�CR����Tg� �HRf��glY����s��-��p��'+����m�_ؒg������C�{ �	����Ȫ�ϏΙ3g�-�GR|׹7`G��񥡘�0�U��_ٵZЏ�د�D�)���\>����ʗ������z N���@��~~��-��P��{rs���@�<����|.]�Ը|��m|g����_��y�W�KD1�b�M���%�s\����r�1��n�\�ƒ�"-� �`.4��~%3��I}[0A��$��= -�>BH"G�ۏ�^r��<�EBG�i �%���9�@^�~~
@�����1����@� t�-[����{%@C�$�mAg���Κ5kʆх����/双O��l��ӿ��B�@.X���u�p�O��6��x�9MPn�`߷o_���^n�`t�
��(�����\r��s�A�y���ۂ�T��@h
�E0l�0��;�tڵӘkƸN����Y�jU��
S#�|^㽺- |��p�
N�.���ޥ`�^{�zL�6��4 �ě�b��e�]&"�d�sΜ9Uޥ�U0�!
��*nP�*`���o֨v����i8G�����hh��m������ɓ�s�=�{J�U0�Ղ���wZ������������8bEz���,Y�D��![C�>}��7:k׮
�no��f� >jvR?#b��X�(��F�AT�F��i��[�{��zv��>��C���a+�[0B2�D��=��G~�(
�ĺ������LO�\s�܂>"8|�`[)
&Lp8�'��������4 oGe�#�ۏ�lْ_\�D̀܂�2Z�l��i�9��
t�ȑ9f ޢ�-����=���Y�y��n?uQ�}Xͬ�sA�i >=��1�=R��+� +
�܂��.2 ��K������CƢۃ20h� �˫%53�5@�MA�%���̣������j[��9�;�� _(�����0��~r���\�{�m�P����x#TT9��n?����N#��ץ&�}� ��)
�T�VL�!���j���`�p
 �8@Rr�UAV�A����=��-����pLH�`@n�*Ȋ1�܂U���?}w
 ]�H2@�ߴi��V���[�˯%�������5 �8�)Э
T`��|rZbZ-�.�!da+@� ���ߞ�Z�gf�[0p���� �� I��gr�$��o%P�_rCy
�V�|߽����"m�Y���-�[ l��k xA� ��ۯ9]�[pҤI�Ȩ�pP���k ��Feِ���gHE�d�nAm"Z�$��5}���z�8����2r�X�|� ��Sܻw��r�J�s�J�~�T�f�z{ �ͫ ��x�j?j��Q�E�n� �js���|G�xз�<dXt(��Q�E�.�p�47 ��)���;��ys�_�V�D���-XTi����?� �~�薜����� �`Q�=V�?���^�
������.]�|X�
�m�B~��?���J� �D�������~�h r�����ER���A݀�B���~w�q�Ӿ}���<�ŕ[й5�d��-�`�5 ?�Kq�~l4��0@��)����/I��(����؋���n��9���Y�4�!�Cو2ח*w9���GKݐ�s�&�r�e��s��?�6�8J� |(�uwO䴁d�&K)�nA��?R���n@7,��8�=���r�e����n�M�69k��M7�����J��R�]�e�n��9���Z���� /?នo>��󕾤�rzr�� ��`���V{���u��4448�V��ra��p� ��QRZ�<{�dK.F9��#~T���s.����N%*� 
���Ýu�8G&����/W:*x%�{�}@�
 ��l���Nc#�AI�������i����*?�د�0}�g���C"Āpۯ������4薒ҏ(b�8�_Q�Y� ���r7'���`��� �j �6�� *��3�W�g��"��l�
�1�:�Sg}%� �	��P?����1`�����Y� ��"��D�0b@�� �����9������[t��F1���p`k�\U�`��R��A#W81 e`)R�ZM��� ��[u��F0�	rq.����� #^�=C"Ā9P'�R~f�� �
pn�zdC"�e���?�\K����@&$b }jz�3۵� x/{��1 Ra�#�|��ƟUK�= &�^��TM�n�2�9�5)?s���{O'�D��D���o [kM�oK0�x�� �Td�_@]b r� �G�����; ����D��D���1�gaR�`��'`0�  �>\��/���f��������ŀ����!fn�Z�|b����U�.t���ट���r�9�+��������	�b rnE�Dk�= ��8�����!b R�Cl�P�E�`�܌�K�'~�@���}*�!`�@��6 L�
�;��	$b@D��?#��g�F�
��V��1�v��;�Es��Q����=ɮ�4���b@T��n��!��3q�0^�V�� c ��1�ܶ��[����M�=8I����1@�څ@Cu��`N�o�� WJĀ� W����e��I�� n��N�mீ��ܴ�_d��(�4`E܅I� ���"̵�1 *3�+\�E� �\M���)g	r���
���8�>��p�?vI� �0�ǀ~�!b������$'�%"I����R��i�1 �0��? S~&�� �r�����{ n�_�����L�?��T�e��Ǝ�7�C"r��OQ~"qI� ��O 8�?$b �܋r�#@�_�v�J̙��/��3�'d�/����W[����o'N�
�l��-2� ���@j�O~��0���2` H�@�؄��+����pOB� �uO��(l�S�ԕ���9����~�c�:x/�Xd�.���Ɣ�d ��V�y@F $H2� ����+M*�i��l8O@F $H2� ���2�4& r�
PO��֢����7N�YS
 ����Y�1`��;�JS3n� g[�'��@W@"la`32�n?'�HB2p
�hām�mu �����j@F@��V����Z!��xI���H�y�ѱ)��>��Z!6 ���a�`�����dDV$9f���	pM�6�I�!LG:\LdrwPy�~�P�%��L3��7�TK��Am�mo|�6��	3��-�h J3��?�67 �yr���"����g��4. $�1���_�[*��&���S/�dq�������C��h �3��>�6Ŷ%������\�#�RZq�
�=lK|ŔX��X�WS�e j5 /����$���:��v@������8��
�d��1(�z2~F�)���3��͋���l��C�������#����=�.\Lt? %� N$9b�%�:���2��u	 �1|-�	ld�����t $b��@?���@� �F�c��ρ^�D�d�[9�ࠐz�����:
H�@ ��P2v )~���@����z5��|����R�ֵ���|`#�W39؂��<�"-�0��\<�d��u�oGLz 1��Gp����e�倯d� .�j
H�@j�F�3��@ c{s<��J&	�@�����b���w��  �� ��n���v��< �����,M;��*p>p!0hH��{=�����x�]I�� DLh����<'��h8�@V �#��J���f� I�� �Hn����W�}�N�t[u�$�������� �
@� 2 	�]&)�� #�3���,	=%�T���k�&�  I�����I��ӳ� �[8	�	�L�]�]t�T�g���6�-@b2 U�OV��:
 
A?��
} .i�|	�xC���rv�w; ��#�>�i 8_b82 �WP����� �� {'n���8�z;�Ƥy��s� ��@���P��o|�S�ih $3��@߹j��    IEND�B`�

// -------------------------
// File: frontend\app\globals.css
// -------------------------

@import "tailwindcss";



// -------------------------
// File: frontend\app\layout.tsx
// -------------------------

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}


// -------------------------
// File: frontend\app\page.jsx
// -------------------------

'use client';

import React, { useState, useEffect } from 'react';
import { FaSearch, FaLightbulb, FaThLarge, FaQuoteRight, FaQuestionCircle, FaEnvelope, FaUpload, FaUserPlus, FaSignInAlt, FaSignOutAlt, FaEye, FaHandPointer, FaComments, FaRocket, FaPaintBrush, FaCode, FaMobileAlt, FaPencilAlt, FaVideo, FaCamera, FaMicrophone, FaLayerGroup, FaArrowRight, FaQuoteLeft, FaTimes, FaChevronDown, FaBriefcase, FaUserTie, FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram, FaUserCircle } from 'react-icons/fa';
import { signInWithEmailAndPassword } from "firebase/auth";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { updateProfile } from "firebase/auth";

const projectsData = [
  {
    id: '1',
    title: 'SaaS Product Landing Page',
    freelancerName: 'Anya Sharma',
    freelancerBio: 'UX/UI Designer with 7+ years of experience specializing in web applications and SaaS platforms. Passionate about user-centric design, creating intuitive and beautiful interfaces.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    price: '1200',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'A sleek, conversion-optimized landing page designed for a new SaaS product. This project focused on clear value proposition, engaging animations, and seamless call-to-actions to maximize user engagement. Delivered with fully responsive designs for desktop and mobile, ensuring optimal viewing across all devices.',
    designHighlights: [
      'Modern, minimalist aesthetic',
      'Intuitive navigation and user flow',
      'Optimized for high conversion rates',
      'Custom vector iconography and illustrations',
      'Consistent brand storytelling'
    ],
    technologies: ['Figma', 'HTML5', 'CSS3 (SCSS)', 'JavaScript (React)', 'Webflow']
  },
  {
    id: '2',
    title: 'E-commerce Mobile App UI/UX',
    freelancerName: 'David Lee',
    freelancerBio: 'Mobile UI/UX expert with a focus on creating delightful and efficient user experiences for iOS and Android applications. I prioritize user research and testing to deliver truly impactful designs.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    price: '950',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'A complete UI/UX design for a modern e-commerce mobile application. This comprehensive project includes detailed user flows, wireframes, high-fidelity mockups, and interactive prototypes for both iOS and Android platforms. Designed for a seamless and intuitive shopping experience, from browsing to checkout.',
    designHighlights: [
      'Smooth and fast checkout flow',
      'Personalized product recommendations engine',
      'Integrated dark mode compatibility',
      'Delicate animated transitions for engagement',
      'Accessibility-first design principles'
    ],
    technologies: ['Adobe XD', 'Sketch', 'Principle', 'Material Design', 'Human Interface Guidelines']
  },
  {
    id: '3',
    title: 'Complete Brand Identity & Logo',
    freelancerName: 'Chloe Kim',
    freelancerBio: 'Brand strategist and graphic designer dedicated to crafting unique and memorable brand identities that resonate with target audiences. My passion is building brands from the ground up.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/67.jpg',
    price: '1800',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'A comprehensive brand identity package covering logo design, typography, color palette, brand guidelines, and supporting visual assets. This project aims to create a strong, cohesive, and impactful brand presence for a new startup.',
    designHighlights: [
      'Unique and scalable logo mark',
      'Versatile brand guidelines documentation',
      'Custom typography pairings',
      'Strategic color psychology application',
      'Brand mood board and visual direction'
    ],
    technologies: ['Adobe Illustrator', 'Adobe Photoshop', 'InDesign', 'Procreate (for initial sketches)']
  },
  {
    id: '4',
    title: 'Custom Digital Character Art',
    freelancerName: 'Omar Hassan',
    freelancerBio: 'Digital artist specializing in character design for games, animation, and print. I bring characters to life with distinct personalities and vibrant aesthetics.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/29.jpg',
    price: '700',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'Creation of a unique digital character, suitable for various media. This includes concept sketches, character sheet with different poses/expressions, and high-resolution final artwork. Perfect for mascots, game characters, or storytelling.',
    designHighlights: [
      'Expressive character poses',
      'Detailed texture and lighting',
      'Dynamic color schemes',
      'Multiple outfit/expression variations'
    ],
    technologies: ['Procreate', 'Clip Studio Paint', 'Adobe Photoshop']
  },
  {
    id: '5',
    title: 'Short Explainer Video & Motion Graphics',
    freelancerName: 'Sara Khan',
    freelancerBio: 'Motion graphics designer and video editor focused on creating engaging visual stories. I transform complex ideas into compelling and digestible animated content.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/79.jpg',
    price: '1500',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'A captivating 60-90 second explainer video with custom motion graphics to clearly articulate a product or service. Includes scriptwriting, voiceover, custom animation, and sound design. Ideal for marketing campaigns and website hero sections.',
    designHighlights: [
      'Engaging visual storytelling',
      'Smooth and professional animations',
      'Custom character and object designs',
      'Crystal clear audio and voiceover'
    ],
    technologies: ['Adobe After Effects', 'Adobe Premiere Pro', 'Illustrator', 'Audacity']
  },
  {
    id: '6',
    title: 'SEO-Optimized Blog Content Package',
    freelancerName: 'Liam Gallagher',
    freelancerBio: 'Content writer and SEO specialist passionate about crafting compelling narratives that rank high and convert. I combine creativity with data-driven strategies to deliver results.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/8.jpg',
    price: '600',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'A package of 5 SEO-optimized blog articles (800-1000 words each) tailored to your industry and keywords. Includes topic research, keyword integration, competitive analysis, and compelling calls-to-action. Designed to boost organic traffic and establish thought leadership.',
    designHighlights: [
      'In-depth keyword research',
      'Engaging and informative writing style',
      'Structurally optimized for readability',
      'Strong calls-to-action (CTAs)',
      'Original, plagiarism-free content'
    ],
    technologies: ['Ahrefs', 'Surfer SEO', 'Google Analytics', 'Grammarly']
  },
  {
    id: '7',
    title: 'E-commerce Product Photography',
    freelancerName: 'Nina Petrov',
    freelancerBio: 'Product photographer with an eye for detail and a knack for making products shine. I create high-quality, conversion-focused images for online stores and marketing materials.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/51.jpg',
    price: '850',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'Professional product photography session for e-commerce. Includes studio setup, lighting, high-resolution shots from multiple angles, and post-production editing. Delivers images optimized for web use, ready to upload to your online store.',
    designHighlights: [
      'Sharp, clear imagery',
      'Consistent branding through visuals',
      'Optimal lighting for product details',
      'Clean, distraction-free backgrounds',
      'Web-optimized file sizes'
    ],
    technologies: ['Canon DSLR/Mirrorless', 'Adobe Lightroom', 'Adobe Photoshop', 'Studio Lighting Equipment']
  },
  {
    id: '8',
    title: 'Custom Web Application Development',
    freelancerName: 'Kenji Tanaka',
    freelancerBio: 'Full-stack developer with 10+ years experience building robust and scalable web applications. I focus on clean code and efficient solutions.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/66.jpg',
    price: '3000',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'Development of a custom web application tailored to specific business needs. This service covers front-end and back-end development, database integration, and API creation. Ideal for unique software solutions or internal tools.',
    designHighlights: [
      'Scalable architecture',
      'Secure data handling',
      'User-friendly interface (UX-focused development)',
      'Cross-browser compatibility',
      'Optimized performance'
    ],
    technologies: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'Python (Django/Flask)', 'AWS']
  },
  {
    id: '9',
    title: 'Professional Business Brochure Design',
    freelancerName: 'Isabella Rossi',
    freelancerBio: 'Print and digital designer specializing in marketing collateral. I create impactful visual communication pieces that capture attention and convey messages effectively.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    price: '500',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'Design of a professional, eye-catching business brochure (tri-fold, bi-fold, or custom). Includes content layout, image selection/editing, and print-ready file delivery. Perfect for trade shows, sales kits, or corporate presentations.',
    designHighlights: [
      'Compelling visual hierarchy',
      'High-quality imagery and graphics',
      'Effective call-to-action placement',
      'Print-ready PDF with bleed and crop marks',
      'Branded and cohesive design elements'
    ],
    technologies: ['Adobe InDesign', 'Adobe Photoshop', 'Adobe Illustrator', 'Canva Pro (for quick mockups)']
  }
];

export default function Page() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [bookedProjects, setBookedProjects] = useState({});
  const [activeFaqs, setActiveFaqs] = useState([]);
  const [userType, setUserType] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasSelectedUserType, setHasSelectedUserType] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notification, setNotification] = useState({
    type: '',  // 'success', 'error', 'info'
    message: '',
    visible: false,
  });
  const showNotification = (type, message, duration = 6000) => {
    setNotification({ type, message, visible: true });
    setTimeout(() => {
      setNotification({ type: '', message: '', visible: false });
    }, duration);
  };
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    clientName: '',
    companyName: '',
    freelancerFullName: '',
    freelancerProfession: '',
    freelancerPortfolio: '',
    freelancerBio: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    });
    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, []);


  const openModal = (modalName) => {
    setActiveModal(modalName);
    if (modalName === 'signupModal') {
      setUserType(null); // reset user type when modal opens
      setSignupForm({ // optionally reset form
        email: '',
        password: '',
        confirmPassword: '',
        clientName: '',
        companyName: '',
        freelancerFullName: '',
        freelancerProfession: '',
        freelancerPortfolio: '',
        freelancerBio: ''
      });
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    document.body.style.overflow = '';
  };

  const handleProjectClick = (project) => {
    if (event.target.classList.contains('book-btn')) return;
    setSelectedProject(project);
    openModal('projectDetailModal');
  };

  const handleBookProject = (project) => {
    if (bookedProjects[project.id]) {
      showNotification("info", "This project is already booked!");
      return;
    }
    if (confirm(`Are you sure you want to book "${project.title}" from ${project.freelancerName}?`)) {
      setTimeout(() => {
        showNotification("success", `Booking request for "${project.title}" sent! The freelancer will contact you shortly.`);
        setBookedProjects({ ...bookedProjects, [project.id]: true });
        if (activeModal === 'projectDetailModal') closeModal();
      }, 500);
    } else {
      alert('Booking cancelled.');
    }
  };

  const toggleFaq = (index) => {
    setActiveFaqs(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (loginForm.email && loginForm.password) {
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          loginForm.email,
          loginForm.password
        );
        console.log("User logged in:", userCredential.user);
        showNotification("success", "Login successful!");
        closeModal();
        setLoginForm({ email: '', password: '' });
      } catch (error) {
        showNotification("error", "Login failed: " + error.message);
      }
    } else {
      showNotification("error", "Please fill in all login fields.");
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const {
      email,
      password,
      confirmPassword,
      clientName,
      companyName,
      freelancerFullName,
      freelancerProfession,
      freelancerPortfolio,
      freelancerBio,
    } = signupForm;
    if (!email || !password || !confirmPassword) {
      showNotification("error", "Please fill in all required email and password fields.");
      return;
    }
    if (password !== confirmPassword) {
      showNotification("error", "Passwords do not match!"); 
      return;
    }
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: fullNameOrClientName, // use actual name value from your form
      });
      const uid = userCredential.user.uid;
      // Prepare user data
      let userData = {};
      let collection = "";
      if (userType === "client") {
        if (!clientName) {
          showNotification("error", "Please enter your name.");
          return;
        }
        collection = "clients";
        userData = {
          name: clientName,
          company: companyName || null,
          email,
          uid,
          userType: "client",
        };
      } else {
        if (!freelancerFullName || !freelancerProfession || !freelancerBio) {
          showNotification("error", "Please fill in all required freelancer details.");
          return;
        }
        collection = "freelancers";
        userData = {
          fullName: freelancerFullName,
          profession: freelancerProfession,
          portfolio: freelancerPortfolio || null,
          bio: freelancerBio,
          email,
          uid,
          userType: "freelancer",
        };
      }
      // Save user data in Firestore
      await setDoc(doc(db, collection, uid), userData);
      showNotification("success", "Account created successfully!");
      closeModal();
      // Reset form
      setSignupForm({
        email: "",
        password: "",
        confirmPassword: "",
        clientName: "",
        companyName: "",
        freelancerFullName: "",
        freelancerProfession: "",
        freelancerPortfolio: "",
        freelancerBio: "",
      });
      setUserType("client");
    } catch (error) {
      showNotification("error", "Signup failed: " + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null); // assuming you are tracking user state
      setShowLogoutDialog(true); // show the dialog
      setTimeout(() => {
        setShowLogoutDialog(false); 
      }, 6000);
    } catch (error) {
      console.error('Logout failed:', error.message);
    }
  };

  return (
    <div className="font-sans text-[#212121] leading-relaxed bg-[#f5f5f5] min-h-screen">
      {/* Header */}
      <header className="bg-white py-4 shadow-[0_2px_10px_rgba(0,0,0,0.08)] sticky top-0 z-[1000]">
        <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-center flex-wrap">
          <div className="text-3xl font-bold text-[#6a1b9a]">
            <a href="#" className="text-inherit no-underline">CreativeHub</a>
          </div>
          <nav className={`md:flex md:flex-row md:items-center ${mobileMenuOpen ? 'flex flex-col items-start w-full bg-white p-5 shadow-[0_5px_15px_rgba(0,0,0,0.05)] border-t border-[#eee]' : 'hidden md:flex'}`}>
            <ul className="flex flex-col md:flex-row w-full md:w-auto">
              {[
                { href: 'discover', icon: FaSearch, text: 'Discover' },
                { href: 'how-it-works', icon: FaLightbulb, text: 'How It Works' },
                { href: 'categories', icon: FaThLarge, text: 'Categories' },
              ].map(item => (
                <li key={item.text} className="md:mr-8 my-2 md:my-0 w-full md:w-auto">
                  <a href={item.href} className="text-[#757575] font-semibold text-base flex items-center gap-2 hover:text-[#6a1b9a]" onClick={() => setMobileMenuOpen(false)}>
                    <item.icon /> {item.text}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex flex-col md:flex-row gap-4 md:ml-8 mt-5 md:mt-0 w-full md:w-auto">
              <a href="#" className="bg-[#00bcd4] text-white px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all" onClick={() => setMobileMenuOpen(false)}>
                <FaUpload /> Post Project
              </a>
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all"
                  >
                    <FaUserCircle />
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded font-semibold shadow-md p-4 z-10 w-[200px]">
                      <p className="text-gray-800 font-medium mb-2">
                        {currentUser.displayName || currentUser.email || 'User'}
                      </p>
                      <button
                        onClick={handleLogout}
                        className="text-red-500 hover:text-red-700 text-sm flex items-center gap-2"
                      >
                        <FaSignOutAlt /> Log Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <a href="#" className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all"
                    onClick={(e) => { e.preventDefault(); openModal('signupModal'); setMobileMenuOpen(false); }}>
                    <FaUserPlus /> Sign Up
                  </a>
                  <a href="#" className="bg-transparent text-[#757575] border border-[#757575] px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 hover:text-[#6a1b9a] hover:border-[#6a1b9a] transition-all"
                    onClick={(e) => { e.preventDefault(); openModal('loginModal'); setMobileMenuOpen(false); }}>
                    <FaSignInAlt /> Login
                  </a>
                </>
              )}
            </div>
          </nav>
          <div className="md:hidden flex flex-col gap-1.5 cursor-pointer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <span className="w-6 h-0.5 bg-[#212121] rounded"></span>
            <span className="w-6 h-0.5 bg-[#212121] rounded"></span>
            <span className="w-6 h-0.5 bg-[#212121] rounded"></span>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification.visible && (
        <div className="fixed top-6 right-6 z-[2000]">
          <div className={`bg-white border-2 rounded-xl shadow-xl px-6 py-4 flex items-center gap-3 animate-slideDown ${
            notification.type === 'success'
              ? 'border-green-500'
              : notification.type === 'error'
              ? 'border-red-500'
              : 'border-[#6a1b9a]'
          }`}>
            <svg className={`w-6 h-6 ${
              notification.type === 'success'
                ? 'text-green-500'
                : notification.type === 'error'
                ? 'text-red-500'
                : 'text-purple-600'
            }`} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              {notification.type === 'error' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              )}
            </svg>
            <span className="text-[#212121] font-medium text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#e0f7fa] to-[#e8eaf6] py-24 text-center text-[#212121] relative overflow-hidden">
          <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-[rgba(0,188,212,0.1)] rounded-full blur-[80px]"></div>
          <div className="absolute bottom-[-70px] right-[-70px] w-64 h-64 bg-[rgba(106,27,154,0.1)] rounded-full blur-[100px]"></div>
          <div className="max-w-[800px] mx-auto px-6 relative z-10">
            <h1 className="font-montserrat font-bold text-5xl md:text-6xl text-[#6a1b9a] mb-6 leading-tight">Your Vision, Our Creative Talent.</h1>
            <p className="text-lg md:text-xl text-[#757575] mb-10">Unlock boundless creativity. Explore unique projects, connect with top-tier freelancers, and bring your ideas to life.</p>
            <div className="flex flex-col md:flex-row max-w-[650px] mx-auto mb-5 bg-white rounded-full shadow-[0_8px_25px_rgba(0,0,0,0.15)] border border-[#e0e0e0] overflow-hidden">
              <input type="text" placeholder="Search for designers, developers, writers..." aria-label="Search for freelancers" className="flex-grow border-none p-4 md:p-5 text-base md:text-lg outline-none bg-transparent text-[#212121] placeholder-[#757575] placeholder-opacity-70 md:rounded-l-full" />
              <button className="bg-gradient-to-r from-[#00bcd4] to-[#4dd0e1] text-white p-4 md:p-5 text-base md:text-lg font-semibold hover:translate-x-1 transition-transform">Search</button>
            </div>
            <div className="text-sm text-[#757575]">
              <span className="font-semibold mr-2">Popular:</span>
              {['Web Design', 'Branding', 'Illustration', 'Video Editing'].map(item => (
                <a key={item} href="#" className="text-[#6a1b9a] underline mr-3 hover:text-[#9c27b0]">{item}</a>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-[#fcfcfc] text-center">
          <div className="max-w-[1200px] mx-auto px-6">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-12">How CreativeHub Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: FaEye, title: 'Discover Talent', desc: 'Browse through thousands of stunning portfolios and project showcases from top freelancers worldwide.' },
                { icon: FaHandPointer, title: 'Book & Pay Securely', desc: 'Directly book freelancers for their listed projects with transparent pricing and secure payment options.' },
                { icon: FaComments, title: 'Collaborate & Consult', desc: 'Communicate seamlessly with your chosen freelancer and get expert consultation for your project needs.' },
                { icon: FaRocket, title: 'Achieve Your Goals', desc: 'Receive high-quality deliverables and successfully complete your projects with professional creative support.' }
              ].map(item => (
                <div key={item.title} className="bg-white p-8 rounded-xl shadow-[0_5px_20px_rgba(0,0,0,0.05)] hover:-translate-y-2 hover:shadow-[0_10px_25px_rgba(0,0,0,0.1)] transition-all">
                  <item.icon className="text-5xl text-[#00bcd4] mb-5 bg-[rgba(0,188,212,0.1)] p-4 rounded-full" />
                  <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{item.title}</h3>
                  <p className="text-base text-[#757575]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-20 bg-[#f5f5f5]">
          <div className="max-w-[1200px] mx-auto px-6">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] text-center mb-5">Explore Creative Categories</h2>
            <p className="text-lg text-[#757575] text-center mb-10 max-w-[700px] mx-auto">Find the perfect professional for every creative need.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: FaPaintBrush, title: 'Graphic Design', desc: 'Logos, branding, print & digital.' },
                { icon: FaCode, title: 'Web Development', desc: 'Websites, apps, e-commerce solutions.' },
                { icon: FaMobileAlt, title: 'UI/UX Design', desc: 'App interfaces, user experience, wireframes.' },
                { icon: FaPencilAlt, title: 'Writing & Translation', desc: 'Content, copywriting, localization.' },
                { icon: FaVideo, title: 'Video & Animation', desc: 'Explainer videos, motion graphics, editing.' },
                { icon: FaCamera, title: 'Photography', desc: 'Product, portrait, event photography.' },
                { icon: FaMicrophone, title: 'Audio & Music', desc: 'Voice-overs, music production, sound design.' },
                { icon: FaLayerGroup, title: '3D & CAD', desc: '3D modeling, rendering, architectural viz.' }
              ].map(item => (
                <a key={item.title} href="#" className="flex flex-col items-center text-center bg-white p-6 rounded-xl shadow-[0_5px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_10px_25px_rgba(0,0,0,0.1)] transition-all no-underline">
                  <item.icon className="text-4xl text-[#9c27b0] mb-5" />
                  <h3 className="font-montserrat font-bold text-xl text-[#212121] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#757575] m-0">{item.desc}</p>
                </a>
              ))}
            </div>
            <div className="text-center mt-12">
              <a href="#" className="bg-transparent text-[#757575] border border-[#757575] px-8 py-3.5 rounded-full font-semibold text-base flex items-center gap-2 mx-auto hover:text-[#6a1b9a] hover:border-[#6a1b9a] transition-all">
                View All Categories <FaArrowRight />
              </a>
            </div>
          </div>
        </section>

        {/* Projects Showcase */}
        <section className="py-20 bg-[#fcfcfc]">
          <div className="max-w-[1200px] mx-auto px-6">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] text-center mb-5">Featured Creative Projects</h2>
            <p className="text-lg text-[#757575] text-center mb-10 max-w-[700px] mx-auto">Hand-picked works from our global talent pool.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {projectsData.map(project => (
                <div key={project.id} className="bg-white rounded-xl overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all flex flex-col cursor-pointer" onClick={() => handleProjectClick(project)}>
                  <img src={project.image} alt={project.title} className="w-full h-[250px] object-cover border-b border-[#e0e0e0]" />
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a] mb-2">{project.title}</h3>
                    <p className="text-sm text-[#757575] mb-4 flex items-center gap-2"><FaUserCircle /> by {project.freelancerName}</p>
                    <div className="mt-auto flex justify-between items-center pt-5 border-t border-[#e0e0e0]">
                      <span className="text-2xl font-bold text-[#00bcd4]">${project.price}</span>
                      <button className={`book-btn bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all ${bookedProjects[project.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`} data-project-id={project.id} onClick={(e) => { e.stopPropagation(); handleBookProject(project); }} disabled={bookedProjects[project.id]}>
                        {bookedProjects[project.id] ? 'Booked!' : 'Book Now'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <a href="#" className="bg-[#00bcd4] text-white px-8 py-3.5 rounded-full font-semibold text-base flex items-center gap-2 mx-auto hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all">
                View All Projects <FaArrowRight />
              </a>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="bg-gradient-to-br from-[#e0f7fa] to-[#e8eaf6] py-20 text-center">
          <div className="max-w-[1200px] mx-auto px-6">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-5">What Our Clients Say</h2>
            <p className="text-lg text-[#757575] mb-10 max-w-[700px] mx-auto">Hear from satisfied businesses and individuals.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { name: 'Alex Rodriguez', title: 'CEO, Innovate Solutions', avatar: 'https://randomuser.me/api/portraits/men/50.jpg', text: 'CreativeHub transformed our brand identity! The designer we hired was incredibly talented and professional. The process was smooth and the results exceeded our expectations.' },
                { name: 'Sarah Chen', title: 'Founder, Style Boutique', avatar: 'https://randomuser.me/api/portraits/women/60.jpg', text: 'Finding a skilled web developer used to be a headache, but CreativeHub made it so easy. We got our e-commerce site built on time and within budget. Highly recommend!' },
                { name: 'Mark Davies', title: 'Marketing Director, TechConnect', avatar: 'https://randomuser.me/api/portraits/men/70.jpg', text: 'The content writer I collaborated with on CreativeHub truly understood our voice and delivered exceptional SEO-optimized articles. Our traffic has seen a significant boost since then.' }
              ].map(item => (
                <div key={item.name} className="bg-white p-8 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] text-left relative overflow-hidden">
                  <FaQuoteLeft className="absolute top-5 right-5 text-5xl text-[#9c27b0] opacity-10" />
                  <p className="text-base text-[#212121] mb-6 leading-relaxed italic">{item.text}</p>
                  <div className="flex items-center gap-4 pt-5 border-t border-[#e0e0e0]">
                    <img src={item.avatar} alt="Client Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-[#00bcd4]" />
                    <div>
                      <h4 className="font-montserrat font-bold text-lg text-[#6a1b9a] m-0">{item.name}</h4>
                      <span className="text-sm text-[#757575]">{item.title}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-[#fcfcfc]">
          <div className="max-w-[1200px] mx-auto px-6">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] text-center mb-5">Frequently Asked Questions</h2>
            <p className="text-lg text-[#757575] text-center mb-10 max-w-[700px] mx-auto">Everything you need to know about CreativeHub.</p>
            <div className="max-w-[800px] mx-auto mt-10">
              {[
                { question: 'How do I find a freelancer on CreativeHub?', answer: 'You can use our powerful search bar to find freelancers by skill, project type, or keyword. You can also browse through our curated categories or explore featured projects to discover top talent. Each freelancer has a detailed profile showcasing their portfolio, services, and pricing.' },
                { question: 'What are the payment options and security measures?', answer: 'CreativeHub supports various secure payment methods including credit/debit cards, PayPal, and more. All transactions are protected with industry-standard encryption. We use an escrow system, where your payment is held securely and only released to the freelancer once you approve the completed work.' },
                { question: 'Can I get a refund if I’m not satisfied with the work?', answer: 'Client satisfaction is our priority. If you are not satisfied with the delivered work, you can initiate a dispute resolution process. Our support team will mediate to find a fair solution, which may include revisions, partial refunds, or a full refund depending on the terms and the specific situation.' },
                { question: 'How does CreativeHub ensure project quality?', answer: 'We vet our freelancers through a rigorous application process. Additionally, client reviews and ratings are prominently displayed on freelancer profiles, allowing you to make informed decisions. Our platform also encourages clear communication and milestone-based payments to ensure project success.' }
              ].map((faq, index) => (
                <div key={index} className={`bg-white rounded-lg mb-4 shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-[#e0e0e0] ${activeFaqs.includes(index) ? 'active' : ''}`}>
                  <div className={`p-5 flex justify-between items-center cursor-pointer hover:bg-[#f8f8f8] transition-colors ${activeFaqs.includes(index) ? 'bg-[#6a1b9a] text-white' : ''}`} onClick={() => toggleFaq(index)}>
                    <h3 className={`font-montserrat font-bold text-lg m-0 flex-grow ${activeFaqs.includes(index) ? 'text-white' : 'text-[#212121]'}`}>{faq.question}</h3>
                    <FaChevronDown className={`text-lg ${activeFaqs.includes(index) ? 'text-white rotate-180' : 'text-[#6a1b9a]'} transition-transform`} />
                  </div>
                  <div className={`text-base text-[#757575] ${activeFaqs.includes(index) ? 'max-h-[200px] p-5 pt-0' : 'max-h-0 p-0'} overflow-hidden transition-all`}>
                    <p className="m-0">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Freelancer Section */}
        <section className="bg-gradient-to-br from-[#6a1b9a] to-[#9c27b0] py-24 text-center text-white relative overflow-hidden">
          <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[rgba(255,255,255,0.1)] rounded-full blur-[80px]"></div>
          <div className="absolute bottom-[-70px] left-[-70px] w-64 h-64 bg-[rgba(255,255,255,0.1)] rounded-full blur-[100px]"></div>
          <div className="max-w-[800px] mx-auto px-6 relative z-10">
            <h2 className="font-montserrat font-bold text-4xl md:text-5xl text-white mb-5">Join Our Global Network of Freelancers</h2>
            <p className="text-xl text-[rgba(255,255,255,0.9)] mb-10">Showcase your exceptional talent, connect with clients worldwide, and grow your freelance career with CreativeHub.</p>
            <a href="#" className="bg-white text-[#6a1b9a] px-8 py-3.5 rounded-full font-semibold text-base flex items-center gap-2 mx-auto hover:bg-[#f0f0f0] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all">
              Become a Freelancer <FaArrowRight />
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#212121] text-[#e0e0e0] pt-16 pb-8 text-sm">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-center md:text-left">
            <div>
              <h3 className="font-montserrat font-bold text-xl text-white mb-6">CreativeHub</h3>
              <p className="text-[#bdbdbd] mb-5">Connecting creativity with opportunity.</p>
              <div className="flex justify-center md:justify-start gap-4">
                {/* {[<FaFacebookF />, <FaTwitter />, <FaLinkedinIn />, <FaInstagram />].map((Icon, i) => (
                  <a key={i} href="#" className="text-white text-xl hover:text-[#00bcd4] transition-colors"><Icon /></a>
                ))} */}
              </div>
            </div>
            {[
              { title: 'Explore', links: ['Discover Projects', 'Project Categories', 'Freelancer Directory', 'How It Works'] },
              { title: 'Company', links: ['About Us', 'Careers', 'Press', 'Partnerships'] },
              { title: 'Support', links: ['Help Center', 'FAQ', 'Privacy Policy', 'Terms of Service'] }
            ].map(col => (
              <div key={col.title}>
                <h3 className="font-montserrat font-bold text-xl text-white mb-6">{col.title}</h3>
                <ul className="list-none p-0 m-0">
                  {col.links.map(link => (
                    <li key={link} className="mb-2"><a href="#" className="text-[#bdbdbd] hover:text-[#4dd0e1] transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center pt-8 border-t border-[#424242] text-[#9e9e9e] text-sm">
            <p>© 2023 CreativeHub. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Project Detail Modal */}
      {activeModal === 'projectDetailModal' && selectedProject && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity" onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}>
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[900px] max-h-[90vh] overflow-y-auto relative transform translate-y-0 transition-transform">
            <button className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10" onClick={closeModal}><FaTimes /></button>
            <div className="w-full h-[350px] overflow-hidden border-b border-[#e0e0e0]">
              <img src={selectedProject.image} alt={selectedProject.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-8 text-center">
              <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4">{selectedProject.title}</h2>
              <p className="text-base text-[#212121] mb-6">{selectedProject.description}</p>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Design Highlights</h3>
              <ul className="list-none p-0 mb-6 text-left">
                {selectedProject.designHighlights.map((highlight, i) => (
                  <li key={i} className="bg-[#f0f4f8] border-l-4 border-[#00bcd4] p-3 mb-2 rounded text-base text-[#212121]">{highlight}</li>
                ))}
              </ul>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Technologies Used</h3>
              <div className="flex flex-wrap gap-2 mb-6 justify-start">
                {selectedProject.technologies.map((tech, i) => (
                  <span key={i} className="bg-[#00bcd4] text-white px-4 py-2 rounded-full text-sm font-semibold">{tech}</span>
                ))}
              </div>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">About the Creator</h3>
              <div className="flex items-center gap-5 mb-8">
                <img src={selectedProject.freelancerAvatar} alt={selectedProject.freelancerName} className="w-20 h-20 rounded-full object-cover border-2 border-[#9c27b0] shadow-[0_2px_10px_rgba(0,0,0,0.1)]" />
                <div>
                  <h4 className="font-montserrat font-bold text-xl text-[#6a1b9a] m-0">{selectedProject.freelancerName}</h4>
                  <p className="text-sm text-[#757575] mt-1 mb-0">{selectedProject.freelancerBio}</p>
                </div>
              </div>
              <div className="border-t border-[#e0e0e0] pt-6 flex flex-col md:flex-row justify-between items-center gap-5 mt-8">
                <span className="text-3xl font-bold text-[#00bcd4]">${selectedProject.price}</span>
                <button className={`bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full md:w-auto ${bookedProjects[selectedProject.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`} onClick={() => handleBookProject(selectedProject)} disabled={bookedProjects[selectedProject.id]}>
                  {bookedProjects[selectedProject.id] ? 'Booked!' : 'Book This Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {activeModal === 'loginModal' && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity" onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}>
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[450px] relative transform translate-y-0 transition-transform">
            <button className="absolute top-4 right-4 bg-transparent border-none text-1xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10" onClick={closeModal}><FaTimes /></button>
            <div className="p-8 text-center">
              <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4">Login to CreativeHub</h2>
              <form onSubmit={handleLoginSubmit}>
                <div className="mb-5 text-left">
                  <label htmlFor="loginEmail" className="block text-sm font-semibold text-[#212121] mb-2">Email Address</label>
                  <input type="email" id="loginEmail" placeholder="your.email@example.com" required className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
                </div>
                <div className="mb-5 text-left">
                  <label htmlFor="loginPassword" className="block text-sm font-semibold text-[#212121] mb-2">Password</label>
                  <input type="password" id="loginPassword" placeholder="Enter your password" required className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
                </div>
                <button type="submit" className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-5 py-3 rounded-full font-semibold text-base w-full hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all">Login</button>
                <p className="mt-6 text-sm text-[#757575]">Don't have an account? <a href="#" className="font-semibold text-[#6a1b9a] hover:text-[#9c27b0]" onClick={(e) => { e.preventDefault(); closeModal(); openModal('signupModal'); }}>Sign Up</a></p>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {activeModal === 'signupModal' && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] modal-overlay"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] max-h-[90vh] overflow-hidden relative flex flex-col">
            {/* Fixed Header */}
            <div className="relative p-6 border-b border-gray-200 z-10 bg-white">
              {/* Close Button */}
              <button
                className="absolute top-5 right-5 text-1xl text-[#757575] hover:text-[#6a1b9a] transition-colors"
                onClick={closeModal}
              >
                <FaTimes />
              </button>
              {/* Back Button */}
              {userType && (
                <button
                  type="button"
                  className="absolute top-5 left-5 flex items-center text-sm text-[#757575] hover:text-[#6a1b9a] transition-colors"
                  onClick={() => setUserType(null)}
                >
                  ← <span className="ml-1">Back</span>
                </button>
              )}
              <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] text-center">Join CreativeHub</h2>
              <p className="text-base text-[#757575] text-center">Choose your path to creativity.</p>
            </div>
            {/* Scrollable Form Content */}
            <div className="overflow-y-auto px-8 py-6 flex-1">
              {/* User Type Selection */}
              {!userType && (
                <div className="flex flex-col md:flex-row gap-3 mb-5 justify-center">
                  <button
                    className="flex-1 p-6 border-2 border-[#e0e0e0] text-[#757575] rounded-xl bg-white font-semibold text-base flex flex-col items-center gap-3 hover:border-[#00bcd4] hover:text-[#00bcd4] transition-all"
                    onClick={() => setUserType('client')}
                  >
                    <FaBriefcase className="text-4xl" />
                    <span>I’m Looking for a Freelancer</span>
                  </button>
                  <button
                    className="flex-1 p-6 border-2 border-[#e0e0e0] text-[#757575] rounded-xl bg-white font-semibold text-base flex flex-col items-center gap-3 hover:border-[#00bcd4] hover:text-[#00bcd4] transition-all"
                    onClick={() => setUserType('freelancer')}
                  >
                    <FaUserTie className="text-4xl" />
                    <span>I’m a Freelancer</span>
                  </button>
                </div>
              )}
              {/* Registration Form */}
              {userType && (
                <form onSubmit={handleSignupSubmit}>
                  {/* Common Fields */}
                  <div className="mb-3 text-left">
                    <label htmlFor="signupEmail" className="block text-sm font-semibold text-[#212121] mb-1">Email Address</label>
                    <input type="email" id="signupEmail" placeholder="your.email@example.com" required className="w-full p-2 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0]" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} />
                  </div>
                  <div className="mb-3 text-left">
                    <label htmlFor="signupPassword" className="block text-sm font-semibold text-[#212121] mb-1">Password</label>
                    <input type="password" id="signupPassword" placeholder="Create a password" required className="w-full p-2 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0]" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} />
                  </div>
                  <div className="mb-3 text-left">
                    <label htmlFor="signupConfirmPassword" className="block text-sm font-semibold text-[#212121] mb-1">Confirm Password</label>
                    <input type="password" id="signupConfirmPassword" placeholder="Confirm your password" required className="w-full p-2 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0]" value={signupForm.confirmPassword} onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })} />
                  </div>
                  {/* Client Fields */}
                  {userType === 'client' && (
                    <div className="text-left">
                      <div className="mb-3">
                        <label htmlFor="clientName" className="block text-sm font-semibold text-[#212121] mb-1">Your Name</label>
                        <input type="text" id="clientName" placeholder="e.g., Jane Doe" required className="w-full p-2 border border-[#e0e0e0] rounded-lg" value={signupForm.clientName} onChange={(e) => setSignupForm({ ...signupForm, clientName: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="companyName" className="block text-sm font-semibold text-[#212121] mb-1">Company Name (Optional)</label>
                        <input type="text" id="companyName" placeholder="e.g., Creative Solutions Inc." className="w-full p-2 border border-[#e0e0e0] rounded-lg" value={signupForm.companyName} onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })} />
                      </div>
                    </div>
                  )}
                  {/* Freelancer Fields */}
                  {userType === 'freelancer' && (
                    <div className="text-left">
                      <div className="mb-3">
                        <label htmlFor="freelancerFullName" className="block text-sm font-semibold text-[#212121] mb-1">Full Name</label>
                        <input type="text" id="freelancerFullName" placeholder="e.g., John Smith" required className="w-full p-2 border border-[#e0e0e0] rounded-lg" value={signupForm.freelancerFullName} onChange={(e) => setSignupForm({ ...signupForm, freelancerFullName: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="freelancerProfession" className="block text-sm font-semibold text-[#212121] mb-1">Profession/Niche</label>
                        <input type="text" id="freelancerProfession" placeholder="e.g., Web Developer, Graphic Designer" required className="w-full p-2 border border-[#e0e0e0] rounded-lg" value={signupForm.freelancerProfession} onChange={(e) => setSignupForm({ ...signupForm, freelancerProfession: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="freelancerPortfolio" className="block text-sm font-semibold text-[#212121] mb-1">Portfolio/Website (Optional)</label>
                        <input type="url" id="freelancerPortfolio" placeholder="https://yourportfolio.com" className="w-full p-2 border border-[#e0e0e0] rounded-lg" value={signupForm.freelancerPortfolio} onChange={(e) => setSignupForm({ ...signupForm, freelancerPortfolio: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="freelancerBio" className="block text-sm font-semibold text-[#212121] mb-1">Short Bio</label>
                        <textarea id="freelancerBio" rows="2" placeholder="Tell us about your skills and experience..." required className="w-full p-2 border border-[#e0e0e0] rounded-lg resize-y" value={signupForm.freelancerBio} onChange={(e) => setSignupForm({ ...signupForm, freelancerBio: e.target.value })}></textarea>
                      </div>
                    </div>
                  )}
                  {/* Submit Button */}
                  <button type="submit" className="mt-4 bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-5 py-3 rounded-full font-semibold text-base w-full hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all">
                    Create Account
                  </button>
                  {/* Switch to Login */}
                  <p className="mt-4 text-sm text-[#757575] text-center">
                    Already have an account?{' '}
                    <a href="#" className="font-semibold text-[#6a1b9a] hover:text-[#9c27b0]" onClick={(e) => { e.preventDefault(); closeModal(); openModal('loginModal'); }}>
                      Login
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* LogOut */}
      {showLogoutDialog && (
        <div className="fixed top-6 right-6 z-[2000]">
          <div className="bg-white border-2 border-green-500 rounded-xl shadow-x2 px-8 py-6 flex items-center gap-3 animate-slideDown">
            <svg className="text-green-500 w-8 h-8" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[#212121] font-bold text-base">User Logged Out Successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------
// File: frontend\app\[id]\profile\page.jsx
// -------------------------






'use client';

import React, { useState } from 'react';
import { FaUserCircle, FaArrowRight, FaTimes, FaEnvelope, FaHome, FaProjectDiagram, FaInbox, FaPlus, FaEdit } from 'react-icons/fa';
import ChatModal from '../../../component/page';

// Mock initial freelancer data
const initialFreelancerData = {
  name: 'Anya Sharma',
  profession: 'UX/UI Designer',
  bio: 'UX/UI Designer with 7+ years of experience specializing in web applications and SaaS platforms. Passionate about user-centric design, creating intuitive and beautiful interfaces.',
  avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  portfolio: 'https://anyasharma.design',
};

// Mock projects data
const initialProjectsData = [
  {
    id: '1',
    title: 'SaaS Product Landing Page',
    freelancerName: 'Anya Sharma',
    freelancerBio: 'UX/UI Designer with 7+ years of experience specializing in web applications and SaaS platforms. Passionate about user-centric design, creating intuitive and beautiful interfaces.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    price: '1200',
    image: 'https://source.unsplash.com/random/800x600/?saas-landing-page,web-design',
    description: 'A sleek, conversion-optimized landing page designed for a new SaaS product. This project focused on clear value proposition, engaging animations, and seamless call-to-actions to maximize user engagement. Delivered with fully responsive designs for desktop and mobile, ensuring optimal viewing across all devices.',
    designHighlights: [
      'Modern, minimalist aesthetic',
      'Intuitive navigation and user flow',
      'Optimized for high conversion rates',
      'Custom vector iconography and illustrations',
      'Consistent brand storytelling',
    ],
    technologies: ['Figma', 'HTML5', 'CSS3 (SCSS)', 'JavaScript (React)', 'Webflow'],
  },
];

// Mock contacts data
const contactsData = [
  {
    id: '1',
    clientName: 'John Doe',
    clientAvatar: 'https://randomuser.me/api/portraits/men/50.jpg',
    message: 'Interested in your SaaS landing page design. Can we discuss customization options?',
    timestamp: '2025-07-20 14:30',
  },
  {
    id: '2',
    clientName: 'Sarah Chen',
    clientAvatar: 'https://randomuser.me/api/portraits/women/60.jpg',
    message: 'Loved your portfolio! Looking for a similar design for my startup. Please get in touch.',
    timestamp: '2025-07-19 09:15',
  },
  {
    id: '3',
    clientName: 'Mark Davies',
    clientAvatar: 'https://randomuser.me/api/portraits/men/70.jpg',
    message: 'Can you provide a timeline for a landing page project? Budget is flexible.',
    timestamp: '2025-07-18 16:45',
  },
  {
    id: '4',
    clientName: 'Emily Watson',
    clientAvatar: 'https://randomuser.me/api/portraits/women/25.jpg',
    message: 'Need a landing page for my SaaS product. Can you share your availability?',
    timestamp: '2025-07-17 11:20',
  },
];

export default function FreelancerDashboard() {
  const [freelancerData, setFreelancerData] = useState(initialFreelancerData);
  const [projectsData, setProjectsData] = useState(initialProjectsData);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [bookedProjects, setBookedProjects] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const [activeSection, setActiveSection] = useState('inquiries');
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    price: '',
    image: '',
    technologies: '',
  });
  const [editProfile, setEditProfile] = useState({
    name: freelancerData.name,
    profession: freelancerData.profession,
    bio: freelancerData.bio,
    avatar: freelancerData.avatar,
    portfolio: freelancerData.portfolio,
  });

  const openModal = (modalType, project = null, client = null) => {
    setSelectedProject(project);
    setSelectedClient(client);
    setActiveModal(modalType);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedProject(null);
    setSelectedClient(null);
    setNewProject({ title: '', description: '', price: '', image: '', technologies: '' });
    setEditProfile({
      name: freelancerData.name,
      profession: freelancerData.profession,
      bio: freelancerData.bio,
      avatar: freelancerData.avatar,
      portfolio: freelancerData.portfolio,
    });
    document.body.style.overflow = '';
  };

  const handleBookProject = (project) => {
    if (bookedProjects[project.id]) {
      alert('This project is already booked!');
      return;
    }
    if (confirm(`Are you sure you want to book "${project.title}" from ${project.freelancerName}?`)) {
      setTimeout(() => {
        alert(`Success! Your booking request for "${project.title}" has been sent. The freelancer will contact you shortly.`);
        setBookedProjects({ ...bookedProjects, [project.id]: true });
        closeModal();
      }, 500);
    } else {
      alert('Booking cancelled.');
    }
  };

  const handleAddProject = (e) => {
    e.preventDefault();
    if (!newProject.title || !newProject.description || !newProject.price || !newProject.image || !newProject.technologies) {
      alert('Please fill in all fields.');
      return;
    }
    const newId = (projectsData.length + 1).toString();
    const newProjectData = {
      id: newId,
      title: newProject.title,
      freelancerName: freelancerData.name,
      freelancerBio: freelancerData.bio,
      freelancerAvatar: freelancerData.avatar,
      price: newProject.price,
      image: newProject.image,
      description: newProject.description,
      designHighlights: ['Custom design', 'Responsive layout', 'User-centric approach'],
      technologies: newProject.technologies.split(',').map(tech => tech.trim()),
    };
    setProjectsData([...projectsData, newProjectData]);
    alert('Project added successfully!');
    closeModal();
  };

  const handleEditProfile = (e) => {
    e.preventDefault();
    if (!editProfile.name || !editProfile.profession || !editProfile.bio || !editProfile.avatar || !editProfile.portfolio) {
      alert('Please fill in all fields.');
      return;
    }
    setFreelancerData(editProfile);
    setProjectsData(projectsData.map(project => ({
      ...project,
      freelancerName: editProfile.name,
      freelancerBio: editProfile.bio,
      freelancerAvatar: editProfile.avatar,
    })));
    alert('Profile updated successfully!');
    closeModal();
  };

  const handleInputChange = (e, setState) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <section id="home" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] flex flex-col items-center justify-center">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4 text-center">Welcome, {freelancerData.name}!</h2>
            <p className="text-lg text-[#757575] mb-6 text-center max-w-[600px]">
              Manage your UX/UI design projects and connect with clients seamlessly. Check your inquiries or explore your projects to get started.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setActiveSection('projects')}
                className="bg-[#00bcd4] text-white px-6 py-3 rounded-full font-semibold text-base inline-flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all"
              >
                View Projects <FaProjectDiagram />
              </button>
              <button
                onClick={() => setActiveSection('inquiries')}
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                View Inquiries <FaInbox />
              </button>
            </div>
          </section>
        );
      case 'projects':
        return (
          <section id="projects" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Your Projects</h2>
              <button
                className="bg-[#00bcd4] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 transition-all"
                onClick={() => openModal('addProjectModal')}
              >
                <FaPlus /> Add Project
              </button>
            </div>
            <div className="space-y-8">
              {projectsData.length > 0 ? (
                projectsData.map(project => (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all flex flex-col md:flex-row overflow-hidden"
                    onClick={() => openModal('projectDetailModal', project)}
                  >
                    <div className="md:w-1/3 bg-[#f0f4f8] p-6 flex flex-col items-center md:items-start text-center md:text-left">
                      <img
                        src={project.freelancerAvatar}
                        alt={project.freelancerName}
                        className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] mb-4"
                      />
                      <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a] mb-2">{project.freelancerName}</h3>
                      <p className="text-sm text-[#757575] mb-4">{project.freelancerBio}</p>
                    </div>
                    <div className="md:w-2/3 p-6 flex flex-col">
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-[200px] object-cover rounded-lg mb-4 border border-[#e0e0e0]"
                      />
                      <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{project.title}</h3>
                      <p className="text-base text-[#757575] mb-4 flex-grow">{project.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="bg-[#00bcd4] text-white px-3 py-1 rounded-full text-sm font-semibold">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-[#e0e0e0]">
                        <span className="text-2xl font-bold text-[#00bcd4]">${project.price}</span>
                        <span
                          className={`px-4 py-2 rounded-full font-semibold text-sm ${bookedProjects[project.id] ? 'bg-[#ccc] text-[#212121]' : 'bg-[#e0f7fa] text-[#00bcd4]'}`}
                        >
                          {bookedProjects[project.id] ? 'Booked' : 'Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#757575] text-lg">No projects listed yet. Add a project to get started!</p>
              )}
            </div>
          </section>
        );
      case 'inquiries':
        return (
          <section id="inquiries" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Client Inquiries</h2>
              <span className="text-sm text-[#757575]">{contactsData.length} Inquiries</span>
            </div>
            <div className="overflow-y-auto overflow-x-hidden max-h-[calc(100vh-160px)] space-y-6">
              {contactsData.length > 0 ? (
                contactsData.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-4 p-4 bg-[#f0f4f8] rounded-lg hover:bg-[#e0f7fa] transition-colors"
                  >
                    <img
                      src={contact.clientAvatar}
                      alt={contact.clientName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#9c27b0]"
                    />
                    <div className="flex-grow">
                      <h4 className="font-montserrat font-bold text-lg text-[#6a1b9a] mb-1">{contact.clientName}</h4>
                      <p className="text-sm text-[#757575] mb-1 line-clamp-2">{contact.message}</p>
                      <p className="text-xs text-[#9e9e9e] m-0">Received: {contact.timestamp}</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`mailto:${contact.clientName.toLowerCase().replace(' ', '.')}@example.com?subject=Re: Project Inquiry`}
                        className="bg-[#00bcd4] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 transition-all"
                      >
                        Reply <FaEnvelope />
                      </a>
                      <button
                        className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all"
                        onClick={() => openModal('chatModal', null, contact)}
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#757575] text-lg">No client inquiries yet.</p>
              )}
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="font-sans text-[#212121] leading-relaxed bg-[#f5f5f5] min-h-screen">
      {/* Header */}
      <header className="bg-white py-4 shadow-[0_2px_10px_rgba(0,0,0,0.08)] sticky top-0 z-[1000]">
        <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-center">
          <div className="text-3xl font-bold text-[#6a1b9a]">
            <a href="/" className="text-inherit no-underline">CreativeHub</a>
          </div>
          <nav className="md:hidden">
            <button
              className="text-[#757575] text-2xl"
              onClick={() => setActiveSection(activeSection === 'home' ? 'inquiries' : 'home')}
            >
              <FaUserCircle />
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar (30%) */}
          <aside className="lg:w-[30%] bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-6 sticky top-20 h-[calc(100vh-80px)] flex flex-col">
            <div className="flex flex-col items-center text-center mb-8">
              <img
                src={freelancerData.avatar}
                alt={freelancerData.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] shadow-[0_2px_10px_rgba(0,0,0,0.1)] mb-4"
              />
              <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{freelancerData.name}</h2>
              <p className="text-lg text-[#757575] mb-2">{freelancerData.profession}</p>
              <p className="text-sm text-[#757575] mb-4">{freelancerData.bio}</p>
              <div className="flex flex-col gap-3 w-full">
                <a
                  href={freelancerData.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#00bcd4] text-white px-6 py-3 rounded-full font-semibold text-base inline-flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all justify-center"
                >
                  View Portfolio <FaArrowRight />
                </a>
                <button
                  className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all flex items-center gap-2 justify-center"
                  onClick={() => openModal('editProfileModal')}
                >
                  Edit Profile <FaEdit />
                </button>
              </div>
            </div>
            <nav className="space-y-4 mt-auto">
              <button
                onClick={() => setActiveSection('home')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'home' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaHome /> Home
              </button>
              <button
                onClick={() => setActiveSection('projects')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'projects' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaProjectDiagram /> Projects
              </button>
              <button
                onClick={() => setActiveSection('inquiries')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'inquiries' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaInbox /> Inquiries
              </button>
            </nav>
          </aside>

          {/* Right Content (70%) */}
          <div className="lg:w-[70%]">{renderSection()}</div>
        </div>
      </main>

      {/* Project Detail Modal */}
      {activeModal === 'projectDetailModal' && selectedProject && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[900px] max-h-[90vh] overflow-y-auto relative transform translate-y-0 transition-transform">
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            <div className="w-full h-[350px] overflow-hidden border-b border-[#e0e0e0]">
              <img src={selectedProject.image} alt={selectedProject.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-8 text-center">
              <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4">{selectedProject.title}</h2>
              <p className="text-base text-[#212121] mb-6">{selectedProject.description}</p>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Design Highlights</h3>
              <ul className="list-none p-0 mb-6 text-left">
                {selectedProject.designHighlights.map((highlight, i) => (
                  <li key={i} className="bg-[#f0f4f8] border-l-4 border-[#00bcd4] p-3 mb-2 rounded text-base text-[#212121]">
                    {highlight}
                  </li>
                ))}
              </ul>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Technologies Used</h3>
              <div className="flex flex-wrap gap-2 mb-6 justify-start">
                {selectedProject.technologies.map((tech, i) => (
                  <span key={i} className="bg-[#00bcd4] text-white px-4 py-2 rounded-full text-sm font-semibold">
                    {tech}
                  </span>
                ))}
              </div>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">About the Creator</h3>
              <div className="flex items-center gap-5 mb-8">
                <img
                  src={selectedProject.freelancerAvatar}
                  alt={selectedProject.freelancerName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#9c27b0] shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
                />
                <div>
                  <h4 className="font-montserrat font-bold text-xl text-[#6a1b9a] m-0">{selectedProject.freelancerName}</h4>
                  <p className="text-sm text-[#757575] mt-1 mb-0">{selectedProject.freelancerBio}</p>
                </div>
              </div>
              <div className="border-t border-[#e0e0e0] pt-6 flex flex-col md:flex-row justify-between items-center gap-5 mt-8">
                <span className="text-3xl font-bold text-[#00bcd4]">${selectedProject.price}</span>
                <button
                  className={`bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full md:w-auto ${bookedProjects[selectedProject.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`}
                  onClick={() => handleBookProject(selectedProject)}
                  disabled={bookedProjects[selectedProject.id]}
                >
                  {bookedProjects[selectedProject.id] ? 'Booked' : 'View Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {activeModal === 'addProjectModal' && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto relative p-8">
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a] mb-6 text-center">Add New Project</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Project Title</label>
                <input
                  type="text"
                  name="title"
                  value={newProject.title}
                  onChange={(e) => handleInputChange(e, setNewProject)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter project title"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Description</label>
                <textarea
                  name="description"
                  value={newProject.description}
                  onChange={(e) => handleInputChange(e, setNewProject)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  rows="4"
                  placeholder="Enter project description"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Price ($)</label>
                <input
                  type="number"
                  name="price"
                  value={newProject.price}
                  onChange={(e) => handleInputChange(e, setNewProject)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter price"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Image URL</label>
                <input
                  type="url"
                  name="image"
                  value={newProject.image}
                  onChange={(e) => handleInputChange(e, setNewProject)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter image URL"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Technologies (comma-separated)</label>
                <input
                  type="text"
                  name="technologies"
                  value={newProject.technologies}
                  onChange={(e) => handleInputChange(e, setNewProject)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="e.g., Figma, HTML5, CSS3"
                />
              </div>
              <button
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full"
                onClick={handleAddProject}
              >
                Add Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {activeModal === 'editProfileModal' && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto relative p-8">
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a] mb-6 text-center">Edit Profile</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={editProfile.name}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Profession</label>
                <input
                  type="text"
                  name="profession"
                  value={editProfile.profession}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter your profession"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={editProfile.bio}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  rows="4"
                  placeholder="Enter your bio"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Avatar URL</label>
                <input
                  type="url"
                  name="avatar"
                  value={editProfile.avatar}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter avatar URL"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Portfolio URL</label>
                <input
                  type="url"
                  name="portfolio"
                  value={editProfile.portfolio}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter portfolio URL"
                />
              </div>
              <button
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full"
                onClick={handleEditProfile}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {activeModal === 'chatModal' && selectedClient && (
        <ChatModal client={selectedClient} freelancer={freelancerData} onClose={closeModal} />
      )}
    </div>
  );
}

// -------------------------
// File: frontend\component\page.jsx
// -------------------------

import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';

const ChatModal = ({ client, freelancer, onClose }) => {
  const [messages, setMessages] = useState([
    { id: '1', sender: 'freelancer', text: `Hi ${client.clientName}, thanks for your inquiry! I'm excited to discuss your project needs.`, timestamp: '2025-07-20 14:32' },
    { id: '2', sender: 'client', text: 'Hi Anya, I loved your SaaS landing page design. Can you customize it for my startup?', timestamp: '2025-07-20 14:35' },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Simulate client replies
  useEffect(() => {
    const timer = setInterval(() => {
      const mockReplies = [
        'Can you share more details about the customization process?',
        'What’s the timeline for a project like this?',
        'Do you offer any discounts for startups?',
      ];
      const randomReply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
      setMessages(prev => [
        ...prev,
        {
          id: (prev.length + 1).toString(),
          sender: 'client',
          text: randomReply,
          timestamp: new Date().toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages(prev => [
      ...prev,
      {
        id: (prev.length + 1).toString(),
        sender: 'freelancer',
        text: newMessage,
        timestamp: new Date().toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setNewMessage('');
  };

  return (
    <div
      className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
      onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}
    >
      <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0]">
          <div className="flex items-center gap-3">
            <img
              src={client.clientAvatar}
              alt={client.clientName}
              className="w-10 h-10 rounded-full object-cover border-2 border-[#00bcd4]"
            />
            <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a]">{client.clientName}</h3>
          </div>
          <button
            className="bg-transparent border-none text-2xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors"
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden bg-[#f5f5f5]">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'freelancer' ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.sender === 'freelancer'
                    ? 'bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white'
                    : 'bg-[#00bcd4] text-white'
                }`}
              >
                <p className="text-sm mb-1">{message.text}</p>
                <p className="text-xs opacity-70">{message.timestamp}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-[#e0e0e0]">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 p-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
              placeholder="Type your message..."
            />
            <button
              className="bg-[#00bcd4] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 transition-all"
              onClick={handleSendMessage}
            >
              <FaPaperPlane /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;

// -------------------------
// File: frontend\lib\firebaseConfig.js
// -------------------------

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD1fJg2Wh4l8HZvOqffvXykp2XBJRIs3y0",
  authDomain: "fb-app-6d2ad.firebaseapp.com",
  projectId: "fb-app-6d2ad",
  storageBucket: "fb-app-6d2ad.firebasestorage.app",
  messagingSenderId: "1024812609990",
  appId: "1:1024812609990:web:d34820f018c1efde7c82c7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };


// -------------------------
// File: frontend\next-env.d.ts
// -------------------------

/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.


// -------------------------
// File: frontend\next.config.ts
// -------------------------

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;


// -------------------------
// File: frontend\package-lock.json
// -------------------------

{
  "name": "frontend",
  "version": "0.1.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "frontend",
      "version": "0.1.0",
      "license": "ISC",
      "dependencies": {
        "firebase": "^12.0.0",
        "next": "15.4.2",
        "react": "19.1.0",
        "react-dom": "19.1.0",
        "react-icons": "^5.5.0"
      },
      "devDependencies": {
        "@tailwindcss/postcss": "^4",
        "@types/node": "^20",
        "@types/react": "^19",
        "@types/react-dom": "^19",
        "tailwindcss": "^4",
        "typescript": "^5"
      }
    },
    "node_modules/@alloc/quick-lru": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@alloc/quick-lru/-/quick-lru-5.2.0.tgz",
      "integrity": "sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@ampproject/remapping": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/@ampproject/remapping/-/remapping-2.3.0.tgz",
      "integrity": "sha512-30iZtAPgz+LTIYoeivqYo853f02jBYSd5uGnGpkFV0M3xOt9aN73erkgYAmZU43x4VfqcnLxW9Kpg3R5LC4YYw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.5",
        "@jridgewell/trace-mapping": "^0.3.24"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@emnapi/runtime": {
      "version": "1.4.5",
      "resolved": "https://registry.npmjs.org/@emnapi/runtime/-/runtime-1.4.5.tgz",
      "integrity": "sha512-++LApOtY0pEEz1zrd9vy1/zXVaVJJ/EbAF3u0fXIzPJEDtnITsBGbbK0EkM72amhl/R5b+5xx0Y/QhcVOpuulg==",
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "tslib": "^2.4.0"
      }
    },
    "node_modules/@firebase/ai": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/@firebase/ai/-/ai-2.0.0.tgz",
      "integrity": "sha512-N/aSHjqOpU+KkYU3piMkbcuxzvqsOvxflLUXBAkYAPAz8wjE2Ye3BQDgKHEYuhMmEWqj6LFgEBUN8wwc6dfMTw==",
      "dependencies": {
        "@firebase/app-check-interop-types": "0.3.3",
        "@firebase/component": "0.7.0",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-types": "0.x"
      }
    },
    "node_modules/@firebase/analytics": {
      "version": "0.10.18",
      "resolved": "https://registry.npmjs.org/@firebase/analytics/-/analytics-0.10.18.tgz",
      "integrity": "sha512-iN7IgLvM06iFk8BeFoWqvVpRFW3Z70f+Qe2PfCJ7vPIgLPjHXDE774DhCT5Y2/ZU/ZbXPDPD60x/XPWEoZLNdg==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/installations": "0.6.19",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/analytics-compat": {
      "version": "0.2.24",
      "resolved": "https://registry.npmjs.org/@firebase/analytics-compat/-/analytics-compat-0.2.24.tgz",
      "integrity": "sha512-jE+kJnPG86XSqGQGhXXYt1tpTbCTED8OQJ/PQ90SEw14CuxRxx/H+lFbWA1rlFtFSsTCptAJtgyRBwr/f00vsw==",
      "dependencies": {
        "@firebase/analytics": "0.10.18",
        "@firebase/analytics-types": "0.8.3",
        "@firebase/component": "0.7.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/analytics-types": {
      "version": "0.8.3",
      "resolved": "https://registry.npmjs.org/@firebase/analytics-types/-/analytics-types-0.8.3.tgz",
      "integrity": "sha512-VrIp/d8iq2g501qO46uGz3hjbDb8xzYMrbu8Tp0ovzIzrvJZ2fvmj649gTjge/b7cCCcjT0H37g1gVtlNhnkbg=="
    },
    "node_modules/@firebase/app": {
      "version": "0.14.0",
      "resolved": "https://registry.npmjs.org/@firebase/app/-/app-0.14.0.tgz",
      "integrity": "sha512-APIAeKvRNFWKJLjIL8wLDjh7u8g6ZjaeVmItyqSjCdEkJj14UuVlus74D8ofsOMWh45HEwxwkd96GYbi+CImEg==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "idb": "7.1.1",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/app-check": {
      "version": "0.11.0",
      "resolved": "https://registry.npmjs.org/@firebase/app-check/-/app-check-0.11.0.tgz",
      "integrity": "sha512-XAvALQayUMBJo58U/rxW02IhsesaxxfWVmVkauZvGEz3vOAjMEQnzFlyblqkc2iAaO82uJ2ZVyZv9XzPfxjJ6w==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/app-check-compat": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/@firebase/app-check-compat/-/app-check-compat-0.4.0.tgz",
      "integrity": "sha512-UfK2Q8RJNjYM/8MFORltZRG9lJj11k0nW84rrffiKvcJxLf1jf6IEjCIkCamykHE73C6BwqhVfhIBs69GXQV0g==",
      "dependencies": {
        "@firebase/app-check": "0.11.0",
        "@firebase/app-check-types": "0.5.3",
        "@firebase/component": "0.7.0",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/app-check-interop-types": {
      "version": "0.3.3",
      "resolved": "https://registry.npmjs.org/@firebase/app-check-interop-types/-/app-check-interop-types-0.3.3.tgz",
      "integrity": "sha512-gAlxfPLT2j8bTI/qfe3ahl2I2YcBQ8cFIBdhAQA4I2f3TndcO+22YizyGYuttLHPQEpWkhmpFW60VCFEPg4g5A=="
    },
    "node_modules/@firebase/app-check-types": {
      "version": "0.5.3",
      "resolved": "https://registry.npmjs.org/@firebase/app-check-types/-/app-check-types-0.5.3.tgz",
      "integrity": "sha512-hyl5rKSj0QmwPdsAxrI5x1otDlByQ7bvNvVt8G/XPO2CSwE++rmSVf3VEhaeOR4J8ZFaF0Z0NDSmLejPweZ3ng=="
    },
    "node_modules/@firebase/app-compat": {
      "version": "0.5.0",
      "resolved": "https://registry.npmjs.org/@firebase/app-compat/-/app-compat-0.5.0.tgz",
      "integrity": "sha512-nUnNpOeRj0KZzVzHsyuyrmZKKHfykZ8mn40FtG28DeSTWeM5b/2P242Va4bmQpJsy5y32vfv50+jvdckrpzy7Q==",
      "dependencies": {
        "@firebase/app": "0.14.0",
        "@firebase/component": "0.7.0",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/app-types": {
      "version": "0.9.3",
      "resolved": "https://registry.npmjs.org/@firebase/app-types/-/app-types-0.9.3.tgz",
      "integrity": "sha512-kRVpIl4vVGJ4baogMDINbyrIOtOxqhkZQg4jTq3l8Lw6WSk0xfpEYzezFu+Kl4ve4fbPl79dvwRtaFqAC/ucCw=="
    },
    "node_modules/@firebase/auth": {
      "version": "1.11.0",
      "resolved": "https://registry.npmjs.org/@firebase/auth/-/auth-1.11.0.tgz",
      "integrity": "sha512-5j7+ua93X+IRcJ1oMDTClTo85l7Xe40WSkoJ+shzPrX7OISlVWLdE1mKC57PSD+/LfAbdhJmvKixINBw2ESK6w==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@react-native-async-storage/async-storage": "^1.18.1"
      },
      "peerDependenciesMeta": {
        "@react-native-async-storage/async-storage": {
          "optional": true
        }
      }
    },
    "node_modules/@firebase/auth-compat": {
      "version": "0.6.0",
      "resolved": "https://registry.npmjs.org/@firebase/auth-compat/-/auth-compat-0.6.0.tgz",
      "integrity": "sha512-J0lGSxXlG/lYVi45wbpPhcWiWUMXevY4fvLZsN1GHh+po7TZVng+figdHBVhFheaiipU8HZyc7ljw1jNojM2nw==",
      "dependencies": {
        "@firebase/auth": "1.11.0",
        "@firebase/auth-types": "0.13.0",
        "@firebase/component": "0.7.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/auth-interop-types": {
      "version": "0.2.4",
      "resolved": "https://registry.npmjs.org/@firebase/auth-interop-types/-/auth-interop-types-0.2.4.tgz",
      "integrity": "sha512-JPgcXKCuO+CWqGDnigBtvo09HeBs5u/Ktc2GaFj2m01hLarbxthLNm7Fk8iOP1aqAtXV+fnnGj7U28xmk7IwVA=="
    },
    "node_modules/@firebase/auth-types": {
      "version": "0.13.0",
      "resolved": "https://registry.npmjs.org/@firebase/auth-types/-/auth-types-0.13.0.tgz",
      "integrity": "sha512-S/PuIjni0AQRLF+l9ck0YpsMOdE8GO2KU6ubmBB7P+7TJUCQDa3R1dlgYm9UzGbbePMZsp0xzB93f2b/CgxMOg==",
      "peerDependencies": {
        "@firebase/app-types": "0.x",
        "@firebase/util": "1.x"
      }
    },
    "node_modules/@firebase/component": {
      "version": "0.7.0",
      "resolved": "https://registry.npmjs.org/@firebase/component/-/component-0.7.0.tgz",
      "integrity": "sha512-wR9En2A+WESUHexjmRHkqtaVH94WLNKt6rmeqZhSLBybg4Wyf0Umk04SZsS6sBq4102ZsDBFwoqMqJYj2IoDSg==",
      "dependencies": {
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/data-connect": {
      "version": "0.3.11",
      "resolved": "https://registry.npmjs.org/@firebase/data-connect/-/data-connect-0.3.11.tgz",
      "integrity": "sha512-G258eLzAD6im9Bsw+Qm1Z+P4x0PGNQ45yeUuuqe5M9B1rn0RJvvsQCRHXgE52Z+n9+WX1OJd/crcuunvOGc7Vw==",
      "dependencies": {
        "@firebase/auth-interop-types": "0.2.4",
        "@firebase/component": "0.7.0",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/database": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@firebase/database/-/database-1.1.0.tgz",
      "integrity": "sha512-gM6MJFae3pTyNLoc9VcJNuaUDej0ctdjn3cVtILo3D5lpp0dmUHHLFN/pUKe7ImyeB1KAvRlEYxvIHNF04Filg==",
      "dependencies": {
        "@firebase/app-check-interop-types": "0.3.3",
        "@firebase/auth-interop-types": "0.2.4",
        "@firebase/component": "0.7.0",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "faye-websocket": "0.11.4",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/database-compat": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/@firebase/database-compat/-/database-compat-2.1.0.tgz",
      "integrity": "sha512-8nYc43RqxScsePVd1qe1xxvWNf0OBnbwHxmXJ7MHSuuTVYFO3eLyLW3PiCKJ9fHnmIz4p4LbieXwz+qtr9PZDg==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/database": "1.1.0",
        "@firebase/database-types": "1.0.16",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/database-types": {
      "version": "1.0.16",
      "resolved": "https://registry.npmjs.org/@firebase/database-types/-/database-types-1.0.16.tgz",
      "integrity": "sha512-xkQLQfU5De7+SPhEGAXFBnDryUWhhlFXelEg2YeZOQMCdoe7dL64DDAd77SQsR+6uoXIZY5MB4y/inCs4GTfcw==",
      "dependencies": {
        "@firebase/app-types": "0.9.3",
        "@firebase/util": "1.13.0"
      }
    },
    "node_modules/@firebase/firestore": {
      "version": "4.9.0",
      "resolved": "https://registry.npmjs.org/@firebase/firestore/-/firestore-4.9.0.tgz",
      "integrity": "sha512-5zl0+/h1GvlCSLt06RMwqFsd7uqRtnNZt4sW99k2rKRd6k/ECObIWlEnvthm2cuOSnUmwZknFqtmd1qyYSLUuQ==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "@firebase/webchannel-wrapper": "1.0.4",
        "@grpc/grpc-js": "~1.9.0",
        "@grpc/proto-loader": "^0.7.8",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/firestore-compat": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/@firebase/firestore-compat/-/firestore-compat-0.4.0.tgz",
      "integrity": "sha512-4O7v4VFeSEwAZtLjsaj33YrMHMRjplOIYC2CiYsF6o/MboOhrhe01VrTt8iY9Y5EwjRHuRz4pS6jMBT8LfQYJA==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/firestore": "4.9.0",
        "@firebase/firestore-types": "3.0.3",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/firestore-types": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/@firebase/firestore-types/-/firestore-types-3.0.3.tgz",
      "integrity": "sha512-hD2jGdiWRxB/eZWF89xcK9gF8wvENDJkzpVFb4aGkzfEaKxVRD1kjz1t1Wj8VZEp2LCB53Yx1zD8mrhQu87R6Q==",
      "peerDependencies": {
        "@firebase/app-types": "0.x",
        "@firebase/util": "1.x"
      }
    },
    "node_modules/@firebase/functions": {
      "version": "0.13.0",
      "resolved": "https://registry.npmjs.org/@firebase/functions/-/functions-0.13.0.tgz",
      "integrity": "sha512-2/LH5xIbD8aaLOWSFHAwwAybgSzHIM0dB5oVOL0zZnxFG1LctX2bc1NIAaPk1T+Zo9aVkLKUlB5fTXTkVUQprQ==",
      "dependencies": {
        "@firebase/app-check-interop-types": "0.3.3",
        "@firebase/auth-interop-types": "0.2.4",
        "@firebase/component": "0.7.0",
        "@firebase/messaging-interop-types": "0.2.3",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/functions-compat": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/@firebase/functions-compat/-/functions-compat-0.4.0.tgz",
      "integrity": "sha512-VPgtvoGFywWbQqtvgJnVWIDFSHV1WE6Hmyi5EGI+P+56EskiGkmnw6lEqc/MEUfGpPGdvmc4I9XMU81uj766/g==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/functions": "0.13.0",
        "@firebase/functions-types": "0.6.3",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/functions-types": {
      "version": "0.6.3",
      "resolved": "https://registry.npmjs.org/@firebase/functions-types/-/functions-types-0.6.3.tgz",
      "integrity": "sha512-EZoDKQLUHFKNx6VLipQwrSMh01A1SaL3Wg6Hpi//x6/fJ6Ee4hrAeswK99I5Ht8roiniKHw4iO0B1Oxj5I4plg=="
    },
    "node_modules/@firebase/installations": {
      "version": "0.6.19",
      "resolved": "https://registry.npmjs.org/@firebase/installations/-/installations-0.6.19.tgz",
      "integrity": "sha512-nGDmiwKLI1lerhwfwSHvMR9RZuIH5/8E3kgUWnVRqqL7kGVSktjLTWEMva7oh5yxQ3zXfIlIwJwMcaM5bK5j8Q==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/util": "1.13.0",
        "idb": "7.1.1",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/installations-compat": {
      "version": "0.2.19",
      "resolved": "https://registry.npmjs.org/@firebase/installations-compat/-/installations-compat-0.2.19.tgz",
      "integrity": "sha512-khfzIY3EI5LePePo7vT19/VEIH1E3iYsHknI/6ek9T8QCozAZshWT9CjlwOzZrKvTHMeNcbpo/VSOSIWDSjWdQ==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/installations": "0.6.19",
        "@firebase/installations-types": "0.5.3",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/installations-types": {
      "version": "0.5.3",
      "resolved": "https://registry.npmjs.org/@firebase/installations-types/-/installations-types-0.5.3.tgz",
      "integrity": "sha512-2FJI7gkLqIE0iYsNQ1P751lO3hER+Umykel+TkLwHj6plzWVxqvfclPUZhcKFVQObqloEBTmpi2Ozn7EkCABAA==",
      "peerDependencies": {
        "@firebase/app-types": "0.x"
      }
    },
    "node_modules/@firebase/logger": {
      "version": "0.5.0",
      "resolved": "https://registry.npmjs.org/@firebase/logger/-/logger-0.5.0.tgz",
      "integrity": "sha512-cGskaAvkrnh42b3BA3doDWeBmuHFO/Mx5A83rbRDYakPjO9bJtRL3dX7javzc2Rr/JHZf4HlterTW2lUkfeN4g==",
      "dependencies": {
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/messaging": {
      "version": "0.12.23",
      "resolved": "https://registry.npmjs.org/@firebase/messaging/-/messaging-0.12.23.tgz",
      "integrity": "sha512-cfuzv47XxqW4HH/OcR5rM+AlQd1xL/VhuaeW/wzMW1LFrsFcTn0GND/hak1vkQc2th8UisBcrkVcQAnOnKwYxg==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/installations": "0.6.19",
        "@firebase/messaging-interop-types": "0.2.3",
        "@firebase/util": "1.13.0",
        "idb": "7.1.1",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/messaging-compat": {
      "version": "0.2.23",
      "resolved": "https://registry.npmjs.org/@firebase/messaging-compat/-/messaging-compat-0.2.23.tgz",
      "integrity": "sha512-SN857v/kBUvlQ9X/UjAqBoQ2FEaL1ZozpnmL1ByTe57iXkmnVVFm9KqAsTfmf+OEwWI4kJJe9NObtN/w22lUgg==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/messaging": "0.12.23",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/messaging-interop-types": {
      "version": "0.2.3",
      "resolved": "https://registry.npmjs.org/@firebase/messaging-interop-types/-/messaging-interop-types-0.2.3.tgz",
      "integrity": "sha512-xfzFaJpzcmtDjycpDeCUj0Ge10ATFi/VHVIvEEjDNc3hodVBQADZ7BWQU7CuFpjSHE+eLuBI13z5F/9xOoGX8Q=="
    },
    "node_modules/@firebase/performance": {
      "version": "0.7.8",
      "resolved": "https://registry.npmjs.org/@firebase/performance/-/performance-0.7.8.tgz",
      "integrity": "sha512-k6xfNM/CdTl4RaV4gT/lH53NU+wP33JiN0pUeNBzGVNvfXZ3HbCkoISE3M/XaiOwHgded1l6XfLHa4zHgm0Wyg==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/installations": "0.6.19",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0",
        "web-vitals": "^4.2.4"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/performance-compat": {
      "version": "0.2.21",
      "resolved": "https://registry.npmjs.org/@firebase/performance-compat/-/performance-compat-0.2.21.tgz",
      "integrity": "sha512-OQfYRsIQiEf9ez1SOMLb5TRevBHNIyA2x1GI1H10lZ432W96AK5r4LTM+SNApg84dxOuHt6RWSQWY7TPWffKXg==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/logger": "0.5.0",
        "@firebase/performance": "0.7.8",
        "@firebase/performance-types": "0.2.3",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/performance-types": {
      "version": "0.2.3",
      "resolved": "https://registry.npmjs.org/@firebase/performance-types/-/performance-types-0.2.3.tgz",
      "integrity": "sha512-IgkyTz6QZVPAq8GSkLYJvwSLr3LS9+V6vNPQr0x4YozZJiLF5jYixj0amDtATf1X0EtYHqoPO48a9ija8GocxQ=="
    },
    "node_modules/@firebase/remote-config": {
      "version": "0.6.6",
      "resolved": "https://registry.npmjs.org/@firebase/remote-config/-/remote-config-0.6.6.tgz",
      "integrity": "sha512-Yelp5xd8hM4NO1G1SuWrIk4h5K42mNwC98eWZ9YLVu6Z0S6hFk1mxotAdCRmH2luH8FASlYgLLq6OQLZ4nbnCA==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/installations": "0.6.19",
        "@firebase/logger": "0.5.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/remote-config-compat": {
      "version": "0.2.19",
      "resolved": "https://registry.npmjs.org/@firebase/remote-config-compat/-/remote-config-compat-0.2.19.tgz",
      "integrity": "sha512-y7PZAb0l5+5oIgLJr88TNSelxuASGlXyAKj+3pUc4fDuRIdPNBoONMHaIUa9rlffBR5dErmaD2wUBJ7Z1a513Q==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/logger": "0.5.0",
        "@firebase/remote-config": "0.6.6",
        "@firebase/remote-config-types": "0.4.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/remote-config-types": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/@firebase/remote-config-types/-/remote-config-types-0.4.0.tgz",
      "integrity": "sha512-7p3mRE/ldCNYt8fmWMQ/MSGRmXYlJ15Rvs9Rk17t8p0WwZDbeK7eRmoI1tvCPaDzn9Oqh+yD6Lw+sGLsLg4kKg=="
    },
    "node_modules/@firebase/storage": {
      "version": "0.14.0",
      "resolved": "https://registry.npmjs.org/@firebase/storage/-/storage-0.14.0.tgz",
      "integrity": "sha512-xWWbb15o6/pWEw8H01UQ1dC5U3rf8QTAzOChYyCpafV6Xki7KVp3Yaw2nSklUwHEziSWE9KoZJS7iYeyqWnYFA==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/storage-compat": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/@firebase/storage-compat/-/storage-compat-0.4.0.tgz",
      "integrity": "sha512-vDzhgGczr1OfcOy285YAPur5pWDEvD67w4thyeCUh6Ys0izN9fNYtA1MJERmNBfqjqu0lg0FM5GLbw0Il21M+g==",
      "dependencies": {
        "@firebase/component": "0.7.0",
        "@firebase/storage": "0.14.0",
        "@firebase/storage-types": "0.8.3",
        "@firebase/util": "1.13.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/storage-types": {
      "version": "0.8.3",
      "resolved": "https://registry.npmjs.org/@firebase/storage-types/-/storage-types-0.8.3.tgz",
      "integrity": "sha512-+Muk7g9uwngTpd8xn9OdF/D48uiQ7I1Fae7ULsWPuKoCH3HU7bfFPhxtJYzyhjdniowhuDpQcfPmuNRAqZEfvg==",
      "peerDependencies": {
        "@firebase/app-types": "0.x",
        "@firebase/util": "1.x"
      }
    },
    "node_modules/@firebase/util": {
      "version": "1.13.0",
      "resolved": "https://registry.npmjs.org/@firebase/util/-/util-1.13.0.tgz",
      "integrity": "sha512-0AZUyYUfpMNcztR5l09izHwXkZpghLgCUaAGjtMwXnCg3bj4ml5VgiwqOMOxJ+Nw4qN/zJAaOQBcJ7KGkWStqQ==",
      "hasInstallScript": true,
      "dependencies": {
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/webchannel-wrapper": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/@firebase/webchannel-wrapper/-/webchannel-wrapper-1.0.4.tgz",
      "integrity": "sha512-6m8+P+dE/RPl4OPzjTxcTbQ0rGeRyeTvAi9KwIffBVCiAMKrfXfLZaqD1F+m8t4B5/Q5aHsMozOgirkH1F5oMQ=="
    },
    "node_modules/@grpc/grpc-js": {
      "version": "1.9.15",
      "resolved": "https://registry.npmjs.org/@grpc/grpc-js/-/grpc-js-1.9.15.tgz",
      "integrity": "sha512-nqE7Hc0AzI+euzUwDAy0aY5hCp10r734gMGRdU+qOPX0XSceI2ULrcXB5U2xSc5VkWwalCj4M7GzCAygZl2KoQ==",
      "dependencies": {
        "@grpc/proto-loader": "^0.7.8",
        "@types/node": ">=12.12.47"
      },
      "engines": {
        "node": "^8.13.0 || >=10.10.0"
      }
    },
    "node_modules/@grpc/proto-loader": {
      "version": "0.7.15",
      "resolved": "https://registry.npmjs.org/@grpc/proto-loader/-/proto-loader-0.7.15.tgz",
      "integrity": "sha512-tMXdRCfYVixjuFK+Hk0Q1s38gV9zDiDJfWL3h1rv4Qc39oILCu1TRTDt7+fGUI8K4G1Fj125Hx/ru3azECWTyQ==",
      "dependencies": {
        "lodash.camelcase": "^4.3.0",
        "long": "^5.0.0",
        "protobufjs": "^7.2.5",
        "yargs": "^17.7.2"
      },
      "bin": {
        "proto-loader-gen-types": "build/bin/proto-loader-gen-types.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/@img/sharp-darwin-arm64": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-darwin-arm64/-/sharp-darwin-arm64-0.34.3.tgz",
      "integrity": "sha512-ryFMfvxxpQRsgZJqBd4wsttYQbCxsJksrv9Lw/v798JcQ8+w84mBWuXwl+TT0WJ/WrYOLaYpwQXi3sA9nTIaIg==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-darwin-arm64": "1.2.0"
      }
    },
    "node_modules/@img/sharp-darwin-x64": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-darwin-x64/-/sharp-darwin-x64-0.34.3.tgz",
      "integrity": "sha512-yHpJYynROAj12TA6qil58hmPmAwxKKC7reUqtGLzsOHfP7/rniNGTL8tjWX6L3CTV4+5P4ypcS7Pp+7OB+8ihA==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-darwin-x64": "1.2.0"
      }
    },
    "node_modules/@img/sharp-libvips-darwin-arm64": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-darwin-arm64/-/sharp-libvips-darwin-arm64-1.2.0.tgz",
      "integrity": "sha512-sBZmpwmxqwlqG9ueWFXtockhsxefaV6O84BMOrhtg/YqbTaRdqDE7hxraVE3y6gVM4eExmfzW4a8el9ArLeEiQ==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "darwin"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-darwin-x64": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-darwin-x64/-/sharp-libvips-darwin-x64-1.2.0.tgz",
      "integrity": "sha512-M64XVuL94OgiNHa5/m2YvEQI5q2cl9d/wk0qFTDVXcYzi43lxuiFTftMR1tOnFQovVXNZJ5TURSDK2pNe9Yzqg==",
      "cpu": [
        "x64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "darwin"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-arm": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-arm/-/sharp-libvips-linux-arm-1.2.0.tgz",
      "integrity": "sha512-mWd2uWvDtL/nvIzThLq3fr2nnGfyr/XMXlq8ZJ9WMR6PXijHlC3ksp0IpuhK6bougvQrchUAfzRLnbsen0Cqvw==",
      "cpu": [
        "arm"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-arm64": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-arm64/-/sharp-libvips-linux-arm64-1.2.0.tgz",
      "integrity": "sha512-RXwd0CgG+uPRX5YYrkzKyalt2OJYRiJQ8ED/fi1tq9WQW2jsQIn0tqrlR5l5dr/rjqq6AHAxURhj2DVjyQWSOA==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-ppc64": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-ppc64/-/sharp-libvips-linux-ppc64-1.2.0.tgz",
      "integrity": "sha512-Xod/7KaDDHkYu2phxxfeEPXfVXFKx70EAFZ0qyUdOjCcxbjqyJOEUpDe6RIyaunGxT34Anf9ue/wuWOqBW2WcQ==",
      "cpu": [
        "ppc64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-s390x": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-s390x/-/sharp-libvips-linux-s390x-1.2.0.tgz",
      "integrity": "sha512-eMKfzDxLGT8mnmPJTNMcjfO33fLiTDsrMlUVcp6b96ETbnJmd4uvZxVJSKPQfS+odwfVaGifhsB07J1LynFehw==",
      "cpu": [
        "s390x"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-x64": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-x64/-/sharp-libvips-linux-x64-1.2.0.tgz",
      "integrity": "sha512-ZW3FPWIc7K1sH9E3nxIGB3y3dZkpJlMnkk7z5tu1nSkBoCgw2nSRTFHI5pB/3CQaJM0pdzMF3paf9ckKMSE9Tg==",
      "cpu": [
        "x64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linuxmusl-arm64": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-arm64/-/sharp-libvips-linuxmusl-arm64-1.2.0.tgz",
      "integrity": "sha512-UG+LqQJbf5VJ8NWJ5Z3tdIe/HXjuIdo4JeVNADXBFuG7z9zjoegpzzGIyV5zQKi4zaJjnAd2+g2nna8TZvuW9Q==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linuxmusl-x64": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-x64/-/sharp-libvips-linuxmusl-x64-1.2.0.tgz",
      "integrity": "sha512-SRYOLR7CXPgNze8akZwjoGBoN1ThNZoqpOgfnOxmWsklTGVfJiGJoC/Lod7aNMGA1jSsKWM1+HRX43OP6p9+6Q==",
      "cpu": [
        "x64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-linux-arm": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-arm/-/sharp-linux-arm-0.34.3.tgz",
      "integrity": "sha512-oBK9l+h6KBN0i3dC8rYntLiVfW8D8wH+NPNT3O/WBHeW0OQWCjfWksLUaPidsrDKpJgXp3G3/hkmhptAW0I3+A==",
      "cpu": [
        "arm"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-arm": "1.2.0"
      }
    },
    "node_modules/@img/sharp-linux-arm64": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-arm64/-/sharp-linux-arm64-0.34.3.tgz",
      "integrity": "sha512-QdrKe3EvQrqwkDrtuTIjI0bu6YEJHTgEeqdzI3uWJOH6G1O8Nl1iEeVYRGdj1h5I21CqxSvQp1Yv7xeU3ZewbA==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-arm64": "1.2.0"
      }
    },
    "node_modules/@img/sharp-linux-ppc64": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-ppc64/-/sharp-linux-ppc64-0.34.3.tgz",
      "integrity": "sha512-GLtbLQMCNC5nxuImPR2+RgrviwKwVql28FWZIW1zWruy6zLgA5/x2ZXk3mxj58X/tszVF69KK0Is83V8YgWhLA==",
      "cpu": [
        "ppc64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-ppc64": "1.2.0"
      }
    },
    "node_modules/@img/sharp-linux-s390x": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-s390x/-/sharp-linux-s390x-0.34.3.tgz",
      "integrity": "sha512-3gahT+A6c4cdc2edhsLHmIOXMb17ltffJlxR0aC2VPZfwKoTGZec6u5GrFgdR7ciJSsHT27BD3TIuGcuRT0KmQ==",
      "cpu": [
        "s390x"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-s390x": "1.2.0"
      }
    },
    "node_modules/@img/sharp-linux-x64": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-x64/-/sharp-linux-x64-0.34.3.tgz",
      "integrity": "sha512-8kYso8d806ypnSq3/Ly0QEw90V5ZoHh10yH0HnrzOCr6DKAPI6QVHvwleqMkVQ0m+fc7EH8ah0BB0QPuWY6zJQ==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-x64": "1.2.0"
      }
    },
    "node_modules/@img/sharp-linuxmusl-arm64": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-linuxmusl-arm64/-/sharp-linuxmusl-arm64-0.34.3.tgz",
      "integrity": "sha512-vAjbHDlr4izEiXM1OTggpCcPg9tn4YriK5vAjowJsHwdBIdx0fYRsURkxLG2RLm9gyBq66gwtWI8Gx0/ov+JKQ==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linuxmusl-arm64": "1.2.0"
      }
    },
    "node_modules/@img/sharp-linuxmusl-x64": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-linuxmusl-x64/-/sharp-linuxmusl-x64-0.34.3.tgz",
      "integrity": "sha512-gCWUn9547K5bwvOn9l5XGAEjVTTRji4aPTqLzGXHvIr6bIDZKNTA34seMPgM0WmSf+RYBH411VavCejp3PkOeQ==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linuxmusl-x64": "1.2.0"
      }
    },
    "node_modules/@img/sharp-wasm32": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-wasm32/-/sharp-wasm32-0.34.3.tgz",
      "integrity": "sha512-+CyRcpagHMGteySaWos8IbnXcHgfDn7pO2fiC2slJxvNq9gDipYBN42/RagzctVRKgxATmfqOSulgZv5e1RdMg==",
      "cpu": [
        "wasm32"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later AND MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/runtime": "^1.4.4"
      },
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-win32-arm64": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-arm64/-/sharp-win32-arm64-0.34.3.tgz",
      "integrity": "sha512-MjnHPnbqMXNC2UgeLJtX4XqoVHHlZNd+nPt1kRPmj63wURegwBhZlApELdtxM2OIZDRv/DFtLcNhVbd1z8GYXQ==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-win32-ia32": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-ia32/-/sharp-win32-ia32-0.34.3.tgz",
      "integrity": "sha512-xuCdhH44WxuXgOM714hn4amodJMZl3OEvf0GVTm0BEyMeA2to+8HEdRPShH0SLYptJY1uBw+SCFP9WVQi1Q/cw==",
      "cpu": [
        "ia32"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-win32-x64": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-x64/-/sharp-win32-x64-0.34.3.tgz",
      "integrity": "sha512-OWwz05d++TxzLEv4VnsTz5CmZ6mI6S05sfQGEMrNrQcOEERbX46332IvE7pO/EUiw7jUrrS40z/M7kPyjfl04g==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@isaacs/fs-minipass": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/@isaacs/fs-minipass/-/fs-minipass-4.0.1.tgz",
      "integrity": "sha512-wgm9Ehl2jpeqP3zw/7mo3kRHFp5MEDhqAdwy1fTGkHAwnkGOVsgpvQhL8B5n1qlb01jV3n/bI0ZfZp5lWA1k4w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "minipass": "^7.0.4"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.12",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.12.tgz",
      "integrity": "sha512-OuLGC46TjB5BbN1dH8JULVVZY4WTdkF7tV9Ys6wLL1rubZnCMstOhNHueU5bLCrnRuDhKPDM4g6sw4Bel5Gzqg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.5.4",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.4.tgz",
      "integrity": "sha512-VT2+G1VQs/9oz078bLrYbecdZKs912zQlkelYpuf+SXF+QvZDYJlbx/LSx+meSAwdDFnF8FVXW92AVjjkVmgFw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.29",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.29.tgz",
      "integrity": "sha512-uw6guiW/gcAGPDhLmd77/6lW8QLeiV5RUTsAX46Db6oLhGaVj4lhnPwb184s1bkc8kdVg/+h988dro8GRDpmYQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@next/env": {
      "version": "15.4.2",
      "resolved": "https://registry.npmjs.org/@next/env/-/env-15.4.2.tgz",
      "integrity": "sha512-kd7MvW3pAP7tmk1NaiX4yG15xb2l4gNhteKQxt3f+NGR22qwPymn9RBuv26QKfIKmfo6z2NpgU8W2RT0s0jlvg==",
      "license": "MIT"
    },
    "node_modules/@next/swc-darwin-arm64": {
      "version": "15.4.2",
      "resolved": "https://registry.npmjs.org/@next/swc-darwin-arm64/-/swc-darwin-arm64-15.4.2.tgz",
      "integrity": "sha512-ovqjR8NjCBdBf1U+R/Gvn0RazTtXS9n6wqs84iFaCS1NHbw9ksVE4dfmsYcLoyUVd9BWE0bjkphOWrrz8uz/uw==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-darwin-x64": {
      "version": "15.4.2",
      "resolved": "https://registry.npmjs.org/@next/swc-darwin-x64/-/swc-darwin-x64-15.4.2.tgz",
      "integrity": "sha512-I8d4W7tPqbdbHRI4z1iBfaoJIBrEG4fnWKIe+Rj1vIucNZ5cEinfwkBt3RcDF00bFRZRDpvKuDjgMFD3OyRBnw==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-arm64-gnu": {
      "version": "15.4.2",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-arm64-gnu/-/swc-linux-arm64-gnu-15.4.2.tgz",
      "integrity": "sha512-lvhz02dU3Ec5thzfQ2RCUeOFADjNkS/px1W7MBt7HMhf0/amMfT8Z/aXOwEA+cVWN7HSDRSUc8hHILoHmvajsg==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-arm64-musl": {
      "version": "15.4.2",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-arm64-musl/-/swc-linux-arm64-musl-15.4.2.tgz",
      "integrity": "sha512-v+5PPfL8UP+KKHS3Mox7QMoeFdMlaV0zeNMIF7eLC4qTiVSO0RPNnK0nkBZSD5BEkkf//c+vI9s/iHxddCZchA==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-x64-gnu": {
      "version": "15.4.2",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-x64-gnu/-/swc-linux-x64-gnu-15.4.2.tgz",
      "integrity": "sha512-PHLYOC9W2cu6I/JEKo77+LW4uPNvyEQiSkVRUQPsOIsf01PRr8PtPhwtz3XNnC9At8CrzPkzqQ9/kYDg4R4Inw==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-x64-musl": {
      "version": "15.4.2",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-x64-musl/-/swc-linux-x64-musl-15.4.2.tgz",
      "integrity": "sha512-lpmUF9FfLFns4JbTu+5aJGA8aR9dXaA12eoNe9CJbVkGib0FDiPa4kBGTwy0xDxKNGlv3bLDViyx1U+qafmuJQ==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-win32-arm64-msvc": {
      "version": "15.4.2",
      "resolved": "https://registry.npmjs.org/@next/swc-win32-arm64-msvc/-/swc-win32-arm64-msvc-15.4.2.tgz",
      "integrity": "sha512-aMjogoGnRepas0LQ/PBPsvvUzj+IoXw2IoDSEShEtrsu2toBiaxEWzOQuPZ8nie8+1iF7TA63S7rlp3YWAjNEg==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-win32-x64-msvc": {
      "version": "15.4.2",
      "resolved": "https://registry.npmjs.org/@next/swc-win32-x64-msvc/-/swc-win32-x64-msvc-15.4.2.tgz",
      "integrity": "sha512-FxwauyexSFu78wEqR/+NB9MnqXVj6SxJKwcVs2CRjeSX/jBagDCgtR2W36PZUYm0WPgY1pQ3C1+nn7zSnwROuw==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@protobufjs/aspromise": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/aspromise/-/aspromise-1.1.2.tgz",
      "integrity": "sha512-j+gKExEuLmKwvz3OgROXtrJ2UG2x8Ch2YZUxahh+s1F2HZ+wAceUNLkvy6zKCPVRkU++ZWQrdxsUeQXmcg4uoQ=="
    },
    "node_modules/@protobufjs/base64": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/base64/-/base64-1.1.2.tgz",
      "integrity": "sha512-AZkcAA5vnN/v4PDqKyMR5lx7hZttPDgClv83E//FMNhR2TMcLUhfRUBHCmSl0oi9zMgDDqRUJkSxO3wm85+XLg=="
    },
    "node_modules/@protobufjs/codegen": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/@protobufjs/codegen/-/codegen-2.0.4.tgz",
      "integrity": "sha512-YyFaikqM5sH0ziFZCN3xDC7zeGaB/d0IUb9CATugHWbd1FRFwWwt4ld4OYMPWu5a3Xe01mGAULCdqhMlPl29Jg=="
    },
    "node_modules/@protobufjs/eventemitter": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/eventemitter/-/eventemitter-1.1.0.tgz",
      "integrity": "sha512-j9ednRT81vYJ9OfVuXG6ERSTdEL1xVsNgqpkxMsbIabzSo3goCjDIveeGv5d03om39ML71RdmrGNjG5SReBP/Q=="
    },
    "node_modules/@protobufjs/fetch": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/fetch/-/fetch-1.1.0.tgz",
      "integrity": "sha512-lljVXpqXebpsijW71PZaCYeIcE5on1w5DlQy5WH6GLbFryLUrBD4932W/E2BSpfRJWseIL4v/KPgBFxDOIdKpQ==",
      "dependencies": {
        "@protobufjs/aspromise": "^1.1.1",
        "@protobufjs/inquire": "^1.1.0"
      }
    },
    "node_modules/@protobufjs/float": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/float/-/float-1.0.2.tgz",
      "integrity": "sha512-Ddb+kVXlXst9d+R9PfTIxh1EdNkgoRe5tOX6t01f1lYWOvJnSPDBlG241QLzcyPdoNTsblLUdujGSE4RzrTZGQ=="
    },
    "node_modules/@protobufjs/inquire": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/inquire/-/inquire-1.1.0.tgz",
      "integrity": "sha512-kdSefcPdruJiFMVSbn801t4vFK7KB/5gd2fYvrxhuJYg8ILrmn9SKSX2tZdV6V+ksulWqS7aXjBcRXl3wHoD9Q=="
    },
    "node_modules/@protobufjs/path": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/path/-/path-1.1.2.tgz",
      "integrity": "sha512-6JOcJ5Tm08dOHAbdR3GrvP+yUUfkjG5ePsHYczMFLq3ZmMkAD98cDgcT2iA1lJ9NVwFd4tH/iSSoe44YWkltEA=="
    },
    "node_modules/@protobufjs/pool": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/pool/-/pool-1.1.0.tgz",
      "integrity": "sha512-0kELaGSIDBKvcgS4zkjz1PeddatrjYcmMWOlAuAPwAeccUrPHdUqo/J6LiymHHEiJT5NrF1UVwxY14f+fy4WQw=="
    },
    "node_modules/@protobufjs/utf8": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/utf8/-/utf8-1.1.0.tgz",
      "integrity": "sha512-Vvn3zZrhQZkkBE8LSuW3em98c0FwgO4nxzv6OdSxPKJIEKY2bGbHn+mhGIPerzI4twdxaP8/0+06HBpwf345Lw=="
    },
    "node_modules/@swc/helpers": {
      "version": "0.5.15",
      "resolved": "https://registry.npmjs.org/@swc/helpers/-/helpers-0.5.15.tgz",
      "integrity": "sha512-JQ5TuMi45Owi4/BIMAJBoSQoOJu12oOk/gADqlcUL9JEdHB8vyjUSsxqeNXnmXHjYKMi2WcYtezGEEhqUI/E2g==",
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.8.0"
      }
    },
    "node_modules/@tailwindcss/node": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/node/-/node-4.1.11.tgz",
      "integrity": "sha512-yzhzuGRmv5QyU9qLNg4GTlYI6STedBWRE7NjxP45CsFYYq9taI0zJXZBMqIC/c8fViNLhmrbpSFS57EoxUmD6Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@ampproject/remapping": "^2.3.0",
        "enhanced-resolve": "^5.18.1",
        "jiti": "^2.4.2",
        "lightningcss": "1.30.1",
        "magic-string": "^0.30.17",
        "source-map-js": "^1.2.1",
        "tailwindcss": "4.1.11"
      }
    },
    "node_modules/@tailwindcss/oxide": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide/-/oxide-4.1.11.tgz",
      "integrity": "sha512-Q69XzrtAhuyfHo+5/HMgr1lAiPP/G40OMFAnws7xcFEYqcypZmdW8eGXaOUIeOl1dzPJBPENXgbjsOyhg2nkrg==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "dependencies": {
        "detect-libc": "^2.0.4",
        "tar": "^7.4.3"
      },
      "engines": {
        "node": ">= 10"
      },
      "optionalDependencies": {
        "@tailwindcss/oxide-android-arm64": "4.1.11",
        "@tailwindcss/oxide-darwin-arm64": "4.1.11",
        "@tailwindcss/oxide-darwin-x64": "4.1.11",
        "@tailwindcss/oxide-freebsd-x64": "4.1.11",
        "@tailwindcss/oxide-linux-arm-gnueabihf": "4.1.11",
        "@tailwindcss/oxide-linux-arm64-gnu": "4.1.11",
        "@tailwindcss/oxide-linux-arm64-musl": "4.1.11",
        "@tailwindcss/oxide-linux-x64-gnu": "4.1.11",
        "@tailwindcss/oxide-linux-x64-musl": "4.1.11",
        "@tailwindcss/oxide-wasm32-wasi": "4.1.11",
        "@tailwindcss/oxide-win32-arm64-msvc": "4.1.11",
        "@tailwindcss/oxide-win32-x64-msvc": "4.1.11"
      }
    },
    "node_modules/@tailwindcss/oxide-android-arm64": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-android-arm64/-/oxide-android-arm64-4.1.11.tgz",
      "integrity": "sha512-3IfFuATVRUMZZprEIx9OGDjG3Ou3jG4xQzNTvjDoKmU9JdmoCohQJ83MYd0GPnQIu89YoJqvMM0G3uqLRFtetg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-darwin-arm64": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-darwin-arm64/-/oxide-darwin-arm64-4.1.11.tgz",
      "integrity": "sha512-ESgStEOEsyg8J5YcMb1xl8WFOXfeBmrhAwGsFxxB2CxY9evy63+AtpbDLAyRkJnxLy2WsD1qF13E97uQyP1lfQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-darwin-x64": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-darwin-x64/-/oxide-darwin-x64-4.1.11.tgz",
      "integrity": "sha512-EgnK8kRchgmgzG6jE10UQNaH9Mwi2n+yw1jWmof9Vyg2lpKNX2ioe7CJdf9M5f8V9uaQxInenZkOxnTVL3fhAw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-freebsd-x64": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-freebsd-x64/-/oxide-freebsd-x64-4.1.11.tgz",
      "integrity": "sha512-xdqKtbpHs7pQhIKmqVpxStnY1skuNh4CtbcyOHeX1YBE0hArj2romsFGb6yUmzkq/6M24nkxDqU8GYrKrz+UcA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-arm-gnueabihf": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm-gnueabihf/-/oxide-linux-arm-gnueabihf-4.1.11.tgz",
      "integrity": "sha512-ryHQK2eyDYYMwB5wZL46uoxz2zzDZsFBwfjssgB7pzytAeCCa6glsiJGjhTEddq/4OsIjsLNMAiMlHNYnkEEeg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-arm64-gnu": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm64-gnu/-/oxide-linux-arm64-gnu-4.1.11.tgz",
      "integrity": "sha512-mYwqheq4BXF83j/w75ewkPJmPZIqqP1nhoghS9D57CLjsh3Nfq0m4ftTotRYtGnZd3eCztgbSPJ9QhfC91gDZQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-arm64-musl": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm64-musl/-/oxide-linux-arm64-musl-4.1.11.tgz",
      "integrity": "sha512-m/NVRFNGlEHJrNVk3O6I9ggVuNjXHIPoD6bqay/pubtYC9QIdAMpS+cswZQPBLvVvEF6GtSNONbDkZrjWZXYNQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-x64-gnu": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-x64-gnu/-/oxide-linux-x64-gnu-4.1.11.tgz",
      "integrity": "sha512-YW6sblI7xukSD2TdbbaeQVDysIm/UPJtObHJHKxDEcW2exAtY47j52f8jZXkqE1krdnkhCMGqP3dbniu1Te2Fg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-x64-musl": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-x64-musl/-/oxide-linux-x64-musl-4.1.11.tgz",
      "integrity": "sha512-e3C/RRhGunWYNC3aSF7exsQkdXzQ/M+aYuZHKnw4U7KQwTJotnWsGOIVih0s2qQzmEzOFIJ3+xt7iq67K/p56Q==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-wasm32-wasi": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-wasm32-wasi/-/oxide-wasm32-wasi-4.1.11.tgz",
      "integrity": "sha512-Xo1+/GU0JEN/C/dvcammKHzeM6NqKovG+6921MR6oadee5XPBaKOumrJCXvopJ/Qb5TH7LX/UAywbqrP4lax0g==",
      "bundleDependencies": [
        "@napi-rs/wasm-runtime",
        "@emnapi/core",
        "@emnapi/runtime",
        "@tybys/wasm-util",
        "@emnapi/wasi-threads",
        "tslib"
      ],
      "cpu": [
        "wasm32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/core": "^1.4.3",
        "@emnapi/runtime": "^1.4.3",
        "@emnapi/wasi-threads": "^1.0.2",
        "@napi-rs/wasm-runtime": "^0.2.11",
        "@tybys/wasm-util": "^0.9.0",
        "tslib": "^2.8.0"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@tailwindcss/oxide-win32-arm64-msvc": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-win32-arm64-msvc/-/oxide-win32-arm64-msvc-4.1.11.tgz",
      "integrity": "sha512-UgKYx5PwEKrac3GPNPf6HVMNhUIGuUh4wlDFR2jYYdkX6pL/rn73zTq/4pzUm8fOjAn5L8zDeHp9iXmUGOXZ+w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-win32-x64-msvc": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-win32-x64-msvc/-/oxide-win32-x64-msvc-4.1.11.tgz",
      "integrity": "sha512-YfHoggn1j0LK7wR82TOucWc5LDCguHnoS879idHekmmiR7g9HUtMw9MI0NHatS28u/Xlkfi9w5RJWgz2Dl+5Qg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/postcss": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/@tailwindcss/postcss/-/postcss-4.1.11.tgz",
      "integrity": "sha512-q/EAIIpF6WpLhKEuQSEVMZNMIY8KhWoAemZ9eylNAih9jxMGAYPPWBn3I9QL/2jZ+e7OEz/tZkX5HwbBR4HohA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@alloc/quick-lru": "^5.2.0",
        "@tailwindcss/node": "4.1.11",
        "@tailwindcss/oxide": "4.1.11",
        "postcss": "^8.4.41",
        "tailwindcss": "4.1.11"
      }
    },
    "node_modules/@types/node": {
      "version": "20.19.9",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-20.19.9.tgz",
      "integrity": "sha512-cuVNgarYWZqxRJDQHEB58GEONhOK79QVR/qYx4S7kcUObQvUwvFnYxJuuHUKm2aieN9X3yZB4LZsuYNU1Qphsw==",
      "license": "MIT",
      "dependencies": {
        "undici-types": "~6.21.0"
      }
    },
    "node_modules/@types/react": {
      "version": "19.1.8",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-19.1.8.tgz",
      "integrity": "sha512-AwAfQ2Wa5bCx9WP8nZL2uMZWod7J7/JSplxbTmBQ5ms6QpqNYm672H0Vu9ZVKVngQ+ii4R/byguVEUZQyeg44g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "csstype": "^3.0.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "19.1.6",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-19.1.6.tgz",
      "integrity": "sha512-4hOiT/dwO8Ko0gV1m/TJZYk3y0KBnY9vzDh7W+DH17b2HFSOGgdj33dhihPeuy3l0q23+4e+hoXHV6hCC4dCXw==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "^19.0.0"
      }
    },
    "node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001727",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001727.tgz",
      "integrity": "sha512-pB68nIHmbN6L/4C6MH1DokyR3bYqFwjaSs/sWDHGj4CTcFtQUQMuJftVwWkXq7mNWOybD3KhUv3oWHoGxgP14Q==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/chownr": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/chownr/-/chownr-3.0.0.tgz",
      "integrity": "sha512-+IxzY9BZOQd/XuYPRmrvEVjF/nqj5kgT4kEq7VofrDoM1MxoRjEWkrCC3EtLi59TVawxTAn+orJwFQcrqEN1+g==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/client-only": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/client-only/-/client-only-0.0.1.tgz",
      "integrity": "sha512-IV3Ou0jSMzZrd3pZ48nLkT9DA7Ag1pnPzaiQhpW7c3RbcqqzvzzVu+L8gfqMp/8IM2MQtSiqaCxrrcfu8I8rMA==",
      "license": "MIT"
    },
    "node_modules/cliui": {
      "version": "8.0.1",
      "resolved": "https://registry.npmjs.org/cliui/-/cliui-8.0.1.tgz",
      "integrity": "sha512-BSeNnyus75C4//NQ9gQt1/csTXyo/8Sb+afLAkzAptFuMsod9HFokGNudZpi/oQV73hnVK+sR+5PVRMd+Dr7YQ==",
      "dependencies": {
        "string-width": "^4.2.0",
        "strip-ansi": "^6.0.1",
        "wrap-ansi": "^7.0.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/color": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/color/-/color-4.2.3.tgz",
      "integrity": "sha512-1rXeuUUiGGrykh+CeBdu5Ie7OJwinCgQY0bc7GCRxy5xVHy+moaqkpL/jqQq0MtQOeYcrqEz4abc5f0KtU7W4A==",
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "color-convert": "^2.0.1",
        "color-string": "^1.9.0"
      },
      "engines": {
        "node": ">=12.5.0"
      }
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "license": "MIT"
    },
    "node_modules/color-string": {
      "version": "1.9.1",
      "resolved": "https://registry.npmjs.org/color-string/-/color-string-1.9.1.tgz",
      "integrity": "sha512-shrVawQFojnZv6xM40anx4CkoDP+fZsw/ZerEMsW/pyzsRbElpsL/DBVW7q3ExxwusdNXI3lXpuhEZkzs8p5Eg==",
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "color-name": "^1.0.0",
        "simple-swizzle": "^0.2.2"
      }
    },
    "node_modules/csstype": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.1.3.tgz",
      "integrity": "sha512-M1uQkMl8rQK/szD0LNhtqxIPLpimGm8sOBwU7lLnCpSbTyY3yeU1Vc7l4KT5zT4s/yOxHH5O7tIuuLOCnLADRw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/detect-libc": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.0.4.tgz",
      "integrity": "sha512-3UDv+G9CsCKO1WKMGw9fwq/SWJYbI0c5Y7LU1AXYoDdbhE2AHQ6N6Nb34sG8Fj7T5APy8qXDCKuuIHd1BR0tVA==",
      "devOptional": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A=="
    },
    "node_modules/enhanced-resolve": {
      "version": "5.18.2",
      "resolved": "https://registry.npmjs.org/enhanced-resolve/-/enhanced-resolve-5.18.2.tgz",
      "integrity": "sha512-6Jw4sE1maoRJo3q8MsSIn2onJFbLTOjY9hlx4DZXmOKvLRd1Ok2kXmAGXaafL2+ijsJZ1ClYbl/pmqr9+k4iUQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "graceful-fs": "^4.2.4",
        "tapable": "^2.2.0"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/faye-websocket": {
      "version": "0.11.4",
      "resolved": "https://registry.npmjs.org/faye-websocket/-/faye-websocket-0.11.4.tgz",
      "integrity": "sha512-CzbClwlXAuiRQAlUyfqPgvPoNKTckTPGfwZV4ZdAhVcP2lh9KUxJg2b5GkE7XbjKQ3YJnQ9z6D9ntLAlB+tP8g==",
      "dependencies": {
        "websocket-driver": ">=0.5.1"
      },
      "engines": {
        "node": ">=0.8.0"
      }
    },
    "node_modules/firebase": {
      "version": "12.0.0",
      "resolved": "https://registry.npmjs.org/firebase/-/firebase-12.0.0.tgz",
      "integrity": "sha512-KV+OrMJpi2uXlqL2zaCcXb7YuQbY/gMIWT1hf8hKeTW1bSumWaHT5qfmn0WTpHwKQa3QEVOtZR2ta9EchcmYuw==",
      "dependencies": {
        "@firebase/ai": "2.0.0",
        "@firebase/analytics": "0.10.18",
        "@firebase/analytics-compat": "0.2.24",
        "@firebase/app": "0.14.0",
        "@firebase/app-check": "0.11.0",
        "@firebase/app-check-compat": "0.4.0",
        "@firebase/app-compat": "0.5.0",
        "@firebase/app-types": "0.9.3",
        "@firebase/auth": "1.11.0",
        "@firebase/auth-compat": "0.6.0",
        "@firebase/data-connect": "0.3.11",
        "@firebase/database": "1.1.0",
        "@firebase/database-compat": "2.1.0",
        "@firebase/firestore": "4.9.0",
        "@firebase/firestore-compat": "0.4.0",
        "@firebase/functions": "0.13.0",
        "@firebase/functions-compat": "0.4.0",
        "@firebase/installations": "0.6.19",
        "@firebase/installations-compat": "0.2.19",
        "@firebase/messaging": "0.12.23",
        "@firebase/messaging-compat": "0.2.23",
        "@firebase/performance": "0.7.8",
        "@firebase/performance-compat": "0.2.21",
        "@firebase/remote-config": "0.6.6",
        "@firebase/remote-config-compat": "0.2.19",
        "@firebase/storage": "0.14.0",
        "@firebase/storage-compat": "0.4.0",
        "@firebase/util": "1.13.0"
      }
    },
    "node_modules/get-caller-file": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/get-caller-file/-/get-caller-file-2.0.5.tgz",
      "integrity": "sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==",
      "engines": {
        "node": "6.* || 8.* || >= 10.*"
      }
    },
    "node_modules/graceful-fs": {
      "version": "4.2.11",
      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/http-parser-js": {
      "version": "0.5.10",
      "resolved": "https://registry.npmjs.org/http-parser-js/-/http-parser-js-0.5.10.tgz",
      "integrity": "sha512-Pysuw9XpUq5dVc/2SMHpuTY01RFl8fttgcyunjL7eEMhGM3cI4eOmiCycJDVCo/7O7ClfQD3SaI6ftDzqOXYMA=="
    },
    "node_modules/idb": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/idb/-/idb-7.1.1.tgz",
      "integrity": "sha512-gchesWBzyvGHRO9W8tzUWFDycow5gwjvFKfyV9FF32Y7F50yZMp7mP+T2mJIWFx49zicqyC4uefHM17o6xKIVQ=="
    },
    "node_modules/is-arrayish": {
      "version": "0.3.2",
      "resolved": "https://registry.npmjs.org/is-arrayish/-/is-arrayish-0.3.2.tgz",
      "integrity": "sha512-eVRqCvVlZbuw3GrM63ovNSNAeA1K16kaR/LRY/92w0zxQ5/1YzwblUX652i4Xs9RwAGjW9d9y6X88t8OaAJfWQ==",
      "license": "MIT",
      "optional": true
    },
    "node_modules/is-fullwidth-code-point": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz",
      "integrity": "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/jiti": {
      "version": "2.4.2",
      "resolved": "https://registry.npmjs.org/jiti/-/jiti-2.4.2.tgz",
      "integrity": "sha512-rg9zJN+G4n2nfJl5MW3BMygZX56zKPNVEYYqq7adpmMh4Jn2QNEwhvQlFy6jPVdcod7txZtKHWnyZiA3a0zP7A==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "jiti": "lib/jiti-cli.mjs"
      }
    },
    "node_modules/lightningcss": {
      "version": "1.30.1",
      "resolved": "https://registry.npmjs.org/lightningcss/-/lightningcss-1.30.1.tgz",
      "integrity": "sha512-xi6IyHML+c9+Q3W0S4fCQJOym42pyurFiJUHEcEyHS0CeKzia4yZDEsLlqOFykxOdHpNy0NmvVO31vcSqAxJCg==",
      "dev": true,
      "license": "MPL-2.0",
      "dependencies": {
        "detect-libc": "^2.0.3"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      },
      "optionalDependencies": {
        "lightningcss-darwin-arm64": "1.30.1",
        "lightningcss-darwin-x64": "1.30.1",
        "lightningcss-freebsd-x64": "1.30.1",
        "lightningcss-linux-arm-gnueabihf": "1.30.1",
        "lightningcss-linux-arm64-gnu": "1.30.1",
        "lightningcss-linux-arm64-musl": "1.30.1",
        "lightningcss-linux-x64-gnu": "1.30.1",
        "lightningcss-linux-x64-musl": "1.30.1",
        "lightningcss-win32-arm64-msvc": "1.30.1",
        "lightningcss-win32-x64-msvc": "1.30.1"
      }
    },
    "node_modules/lightningcss-darwin-arm64": {
      "version": "1.30.1",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-arm64/-/lightningcss-darwin-arm64-1.30.1.tgz",
      "integrity": "sha512-c8JK7hyE65X1MHMN+Viq9n11RRC7hgin3HhYKhrMyaXflk5GVplZ60IxyoVtzILeKr+xAJwg6zK6sjTBJ0FKYQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-x64": {
      "version": "1.30.1",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-x64/-/lightningcss-darwin-x64-1.30.1.tgz",
      "integrity": "sha512-k1EvjakfumAQoTfcXUcHQZhSpLlkAuEkdMBsI/ivWw9hL+7FtilQc0Cy3hrx0AAQrVtQAbMI7YjCgYgvn37PzA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-freebsd-x64": {
      "version": "1.30.1",
      "resolved": "https://registry.npmjs.org/lightningcss-freebsd-x64/-/lightningcss-freebsd-x64-1.30.1.tgz",
      "integrity": "sha512-kmW6UGCGg2PcyUE59K5r0kWfKPAVy4SltVeut+umLCFoJ53RdCUWxcRDzO1eTaxf/7Q2H7LTquFHPL5R+Gjyig==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm-gnueabihf": {
      "version": "1.30.1",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm-gnueabihf/-/lightningcss-linux-arm-gnueabihf-1.30.1.tgz",
      "integrity": "sha512-MjxUShl1v8pit+6D/zSPq9S9dQ2NPFSQwGvxBCYaBYLPlCWuPh9/t1MRS8iUaR8i+a6w7aps+B4N0S1TYP/R+Q==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-gnu": {
      "version": "1.30.1",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-gnu/-/lightningcss-linux-arm64-gnu-1.30.1.tgz",
      "integrity": "sha512-gB72maP8rmrKsnKYy8XUuXi/4OctJiuQjcuqWNlJQ6jZiWqtPvqFziskH3hnajfvKB27ynbVCucKSm2rkQp4Bw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-musl": {
      "version": "1.30.1",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-musl/-/lightningcss-linux-arm64-musl-1.30.1.tgz",
      "integrity": "sha512-jmUQVx4331m6LIX+0wUhBbmMX7TCfjF5FoOH6SD1CttzuYlGNVpA7QnrmLxrsub43ClTINfGSYyHe2HWeLl5CQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-gnu": {
      "version": "1.30.1",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.30.1.tgz",
      "integrity": "sha512-piWx3z4wN8J8z3+O5kO74+yr6ze/dKmPnI7vLqfSqI8bccaTGY5xiSGVIJBDd5K5BHlvVLpUB3S2YCfelyJ1bw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-musl": {
      "version": "1.30.1",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-musl/-/lightningcss-linux-x64-musl-1.30.1.tgz",
      "integrity": "sha512-rRomAK7eIkL+tHY0YPxbc5Dra2gXlI63HL+v1Pdi1a3sC+tJTcFrHX+E86sulgAXeI7rSzDYhPSeHHjqFhqfeQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-arm64-msvc": {
      "version": "1.30.1",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-arm64-msvc/-/lightningcss-win32-arm64-msvc-1.30.1.tgz",
      "integrity": "sha512-mSL4rqPi4iXq5YVqzSsJgMVFENoa4nGTT/GjO2c0Yl9OuQfPsIfncvLrEW6RbbB24WtZ3xP/2CCmI3tNkNV4oA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-x64-msvc": {
      "version": "1.30.1",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-x64-msvc/-/lightningcss-win32-x64-msvc-1.30.1.tgz",
      "integrity": "sha512-PVqXh48wh4T53F/1CCu8PIPCxLzWyCnn/9T5W1Jpmdy5h9Cwd+0YQS6/LwhHXSafuc61/xg9Lv5OrCby6a++jg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lodash.camelcase": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/lodash.camelcase/-/lodash.camelcase-4.3.0.tgz",
      "integrity": "sha512-TwuEnCnxbc3rAvhf/LbG7tJUDzhqXyFnv3dtzLOPgCG/hODL7WFnsbwktkD7yUV0RrreP/l1PALq/YSg6VvjlA=="
    },
    "node_modules/long": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/long/-/long-5.3.2.tgz",
      "integrity": "sha512-mNAgZ1GmyNhD7AuqnTG3/VQ26o760+ZYBPKjPvugO8+nLbYfX6TVpJPseBvopbdY+qpZ/lKUnmEc1LeZYS3QAA=="
    },
    "node_modules/magic-string": {
      "version": "0.30.17",
      "resolved": "https://registry.npmjs.org/magic-string/-/magic-string-0.30.17.tgz",
      "integrity": "sha512-sNPKHvyjVf7gyjwS4xGTaW/mCnF8wnjtifKBEhxfZ7E/S8tQ0rssrwGNn6q8JH/ohItJfSQp9mBtQYuTlH5QnA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0"
      }
    },
    "node_modules/minipass": {
      "version": "7.1.2",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-7.1.2.tgz",
      "integrity": "sha512-qOOzS1cBTWYF4BH8fVePDBOO9iptMnGUEZwNc/cMWnTV2nVLZ7VoNWEPHkYczZA0pdoA7dl6e7FL659nX9S2aw==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": ">=16 || 14 >=14.17"
      }
    },
    "node_modules/minizlib": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/minizlib/-/minizlib-3.0.2.tgz",
      "integrity": "sha512-oG62iEk+CYt5Xj2YqI5Xi9xWUeZhDI8jjQmC5oThVH5JGCTgIjr7ciJDzC7MBzYd//WvR1OTmP5Q38Q8ShQtVA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "minipass": "^7.1.2"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/mkdirp": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/mkdirp/-/mkdirp-3.0.1.tgz",
      "integrity": "sha512-+NsyUUAZDmo6YVHzL/stxSu3t9YS1iljliy3BSDrXJ/dkn1KYdmtZODGGjLcc9XLgVVpH4KshHB8XmZgMhaBXg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "mkdirp": "dist/cjs/src/bin.js"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/nanoid": {
      "version": "3.3.11",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.11.tgz",
      "integrity": "sha512-N8SpfPUnUp1bK+PMYW8qSWdl9U+wwNWI4QKxOYDy9JAro3WMX7p2OeVRF9v+347pnakNevPmiHhNmZ2HbFA76w==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/next": {
      "version": "15.4.2",
      "resolved": "https://registry.npmjs.org/next/-/next-15.4.2.tgz",
      "integrity": "sha512-oH1rmFso+84NIkocfuxaGKcXIjMUTmnzV2x0m8qsYtB4gD6iflLMESXt5XJ8cFgWMBei4v88rNr/j+peNg72XA==",
      "license": "MIT",
      "dependencies": {
        "@next/env": "15.4.2",
        "@swc/helpers": "0.5.15",
        "caniuse-lite": "^1.0.30001579",
        "postcss": "8.4.31",
        "styled-jsx": "5.1.6"
      },
      "bin": {
        "next": "dist/bin/next"
      },
      "engines": {
        "node": "^18.18.0 || ^19.8.0 || >= 20.0.0"
      },
      "optionalDependencies": {
        "@next/swc-darwin-arm64": "15.4.2",
        "@next/swc-darwin-x64": "15.4.2",
        "@next/swc-linux-arm64-gnu": "15.4.2",
        "@next/swc-linux-arm64-musl": "15.4.2",
        "@next/swc-linux-x64-gnu": "15.4.2",
        "@next/swc-linux-x64-musl": "15.4.2",
        "@next/swc-win32-arm64-msvc": "15.4.2",
        "@next/swc-win32-x64-msvc": "15.4.2",
        "sharp": "^0.34.3"
      },
      "peerDependencies": {
        "@opentelemetry/api": "^1.1.0",
        "@playwright/test": "^1.51.1",
        "babel-plugin-react-compiler": "*",
        "react": "^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0",
        "react-dom": "^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0",
        "sass": "^1.3.0"
      },
      "peerDependenciesMeta": {
        "@opentelemetry/api": {
          "optional": true
        },
        "@playwright/test": {
          "optional": true
        },
        "babel-plugin-react-compiler": {
          "optional": true
        },
        "sass": {
          "optional": true
        }
      }
    },
    "node_modules/next/node_modules/postcss": {
      "version": "8.4.31",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.4.31.tgz",
      "integrity": "sha512-PS08Iboia9mts/2ygV3eLpY5ghnUcfLV/EXTOW1E2qYxJKGGBUtNjN76FYHnMs36RmARn41bC0AZmn+rR0OVpQ==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.6",
        "picocolors": "^1.0.0",
        "source-map-js": "^1.0.2"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "license": "ISC"
    },
    "node_modules/postcss": {
      "version": "8.5.6",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.6.tgz",
      "integrity": "sha512-3Ybi1tAuwAP9s0r1UQ2J4n5Y0G05bJkpUIO0/bI9MhwmD70S5aTWbXGBwxHrelT+XM1k6dM0pk+SwNkpTRN7Pg==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.11",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/protobufjs": {
      "version": "7.5.3",
      "resolved": "https://registry.npmjs.org/protobufjs/-/protobufjs-7.5.3.tgz",
      "integrity": "sha512-sildjKwVqOI2kmFDiXQ6aEB0fjYTafpEvIBs8tOR8qI4spuL9OPROLVu2qZqi/xgCfsHIwVqlaF8JBjWFHnKbw==",
      "hasInstallScript": true,
      "dependencies": {
        "@protobufjs/aspromise": "^1.1.2",
        "@protobufjs/base64": "^1.1.2",
        "@protobufjs/codegen": "^2.0.4",
        "@protobufjs/eventemitter": "^1.1.0",
        "@protobufjs/fetch": "^1.1.0",
        "@protobufjs/float": "^1.0.2",
        "@protobufjs/inquire": "^1.1.0",
        "@protobufjs/path": "^1.1.2",
        "@protobufjs/pool": "^1.1.0",
        "@protobufjs/utf8": "^1.1.0",
        "@types/node": ">=13.7.0",
        "long": "^5.0.0"
      },
      "engines": {
        "node": ">=12.0.0"
      }
    },
    "node_modules/react": {
      "version": "19.1.0",
      "resolved": "https://registry.npmjs.org/react/-/react-19.1.0.tgz",
      "integrity": "sha512-FS+XFBNvn3GTAWq26joslQgWNoFu08F4kl0J4CgdNKADkdSGXQyTCnKteIAJy96Br6YbpEU1LSzV5dYtjMkMDg==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "19.1.0",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-19.1.0.tgz",
      "integrity": "sha512-Xs1hdnE+DyKgeHJeJznQmYMIBG3TKIHJJT95Q58nHLSrElKlGQqDTR2HQ9fx5CN/Gk6Vh/kupBTDLU11/nDk/g==",
      "license": "MIT",
      "dependencies": {
        "scheduler": "^0.26.0"
      },
      "peerDependencies": {
        "react": "^19.1.0"
      }
    },
    "node_modules/react-icons": {
      "version": "5.5.0",
      "resolved": "https://registry.npmjs.org/react-icons/-/react-icons-5.5.0.tgz",
      "integrity": "sha512-MEFcXdkP3dLo8uumGI5xN3lDFNsRtrjbOEKDLD7yv76v4wpnEq2Lt2qeHaQOr34I/wPN3s3+N08WkQ+CW37Xiw==",
      "license": "MIT",
      "peerDependencies": {
        "react": "*"
      }
    },
    "node_modules/require-directory": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/require-directory/-/require-directory-2.1.1.tgz",
      "integrity": "sha512-fGxEI7+wsG9xrvdjsrlmL22OMTTiHRwAMroiEeMgq8gzoLC/PQr7RsRDSTLUg/bZAZtF+TVIkHc6/4RIKrui+Q==",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/safe-buffer": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz",
      "integrity": "sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ]
    },
    "node_modules/scheduler": {
      "version": "0.26.0",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.26.0.tgz",
      "integrity": "sha512-NlHwttCI/l5gCPR3D1nNXtWABUmBwvZpEQiD4IXSbIDq8BzLIK/7Ir5gTFSGZDUu37K5cMNp0hFtzO38sC7gWA==",
      "license": "MIT"
    },
    "node_modules/semver": {
      "version": "7.7.2",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.7.2.tgz",
      "integrity": "sha512-RF0Fw+rO5AMf9MAyaRXI4AV0Ulj5lMHqVxxdSgiVbixSCXoEmmX/jk0CuJw4+3SqroYO9VoUh+HcuJivvtJemA==",
      "license": "ISC",
      "optional": true,
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/sharp": {
      "version": "0.34.3",
      "resolved": "https://registry.npmjs.org/sharp/-/sharp-0.34.3.tgz",
      "integrity": "sha512-eX2IQ6nFohW4DbvHIOLRB3MHFpYqaqvXd3Tp5e/T/dSH83fxaNJQRvDMhASmkNTsNTVF2/OOopzRCt7xokgPfg==",
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "optional": true,
      "dependencies": {
        "color": "^4.2.3",
        "detect-libc": "^2.0.4",
        "semver": "^7.7.2"
      },
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-darwin-arm64": "0.34.3",
        "@img/sharp-darwin-x64": "0.34.3",
        "@img/sharp-libvips-darwin-arm64": "1.2.0",
        "@img/sharp-libvips-darwin-x64": "1.2.0",
        "@img/sharp-libvips-linux-arm": "1.2.0",
        "@img/sharp-libvips-linux-arm64": "1.2.0",
        "@img/sharp-libvips-linux-ppc64": "1.2.0",
        "@img/sharp-libvips-linux-s390x": "1.2.0",
        "@img/sharp-libvips-linux-x64": "1.2.0",
        "@img/sharp-libvips-linuxmusl-arm64": "1.2.0",
        "@img/sharp-libvips-linuxmusl-x64": "1.2.0",
        "@img/sharp-linux-arm": "0.34.3",
        "@img/sharp-linux-arm64": "0.34.3",
        "@img/sharp-linux-ppc64": "0.34.3",
        "@img/sharp-linux-s390x": "0.34.3",
        "@img/sharp-linux-x64": "0.34.3",
        "@img/sharp-linuxmusl-arm64": "0.34.3",
        "@img/sharp-linuxmusl-x64": "0.34.3",
        "@img/sharp-wasm32": "0.34.3",
        "@img/sharp-win32-arm64": "0.34.3",
        "@img/sharp-win32-ia32": "0.34.3",
        "@img/sharp-win32-x64": "0.34.3"
      }
    },
    "node_modules/simple-swizzle": {
      "version": "0.2.2",
      "resolved": "https://registry.npmjs.org/simple-swizzle/-/simple-swizzle-0.2.2.tgz",
      "integrity": "sha512-JA//kQgZtbuY83m+xT+tXJkmJncGMTFT+C+g2h2R9uxkYIrE2yy9sgmcLhCnw57/WSD+Eh3J97FPEDFnbXnDUg==",
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "is-arrayish": "^0.3.1"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/styled-jsx": {
      "version": "5.1.6",
      "resolved": "https://registry.npmjs.org/styled-jsx/-/styled-jsx-5.1.6.tgz",
      "integrity": "sha512-qSVyDTeMotdvQYoHWLNGwRFJHC+i+ZvdBRYosOFgC+Wg1vx4frN2/RG/NA7SYqqvKNLf39P2LSRA2pu6n0XYZA==",
      "license": "MIT",
      "dependencies": {
        "client-only": "0.0.1"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "peerDependencies": {
        "react": ">= 16.8.0 || 17.x.x || ^18.0.0-0 || ^19.0.0-0"
      },
      "peerDependenciesMeta": {
        "@babel/core": {
          "optional": true
        },
        "babel-plugin-macros": {
          "optional": true
        }
      }
    },
    "node_modules/tailwindcss": {
      "version": "4.1.11",
      "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-4.1.11.tgz",
      "integrity": "sha512-2E9TBm6MDD/xKYe+dvJZAmg3yxIEDNRc0jwlNyDg/4Fil2QcSLjFKGVff0lAf1jjeaArlG/M75Ey/EYr/OJtBA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/tapable": {
      "version": "2.2.2",
      "resolved": "https://registry.npmjs.org/tapable/-/tapable-2.2.2.tgz",
      "integrity": "sha512-Re10+NauLTMCudc7T5WLFLAwDhQ0JWdrMK+9B2M8zR5hRExKmsRDCBA7/aV/pNJFltmBFO5BAMlQFi/vq3nKOg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/tar": {
      "version": "7.4.3",
      "resolved": "https://registry.npmjs.org/tar/-/tar-7.4.3.tgz",
      "integrity": "sha512-5S7Va8hKfV7W5U6g3aYxXmlPoZVAwUMy9AOKyF2fVuZa2UD3qZjg578OrLRt8PcNN1PleVaL/5/yYATNL0ICUw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "@isaacs/fs-minipass": "^4.0.0",
        "chownr": "^3.0.0",
        "minipass": "^7.1.2",
        "minizlib": "^3.0.1",
        "mkdirp": "^3.0.1",
        "yallist": "^5.0.0"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
      "license": "0BSD"
    },
    "node_modules/typescript": {
      "version": "5.8.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.8.3.tgz",
      "integrity": "sha512-p1diW6TqL9L07nNxvRMM7hMMw4c5XOo/1ibL4aAIGmSAt9slTE1Xgw5KWuof2uTOvCg9BY7ZRi+GaF+7sfgPeQ==",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/undici-types": {
      "version": "6.21.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-6.21.0.tgz",
      "integrity": "sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ==",
      "license": "MIT"
    },
    "node_modules/web-vitals": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/web-vitals/-/web-vitals-4.2.4.tgz",
      "integrity": "sha512-r4DIlprAGwJ7YM11VZp4R884m0Vmgr6EAKe3P+kO0PPj3Unqyvv59rczf6UiGcb9Z8QxZVcqKNwv/g0WNdWwsw=="
    },
    "node_modules/websocket-driver": {
      "version": "0.7.4",
      "resolved": "https://registry.npmjs.org/websocket-driver/-/websocket-driver-0.7.4.tgz",
      "integrity": "sha512-b17KeDIQVjvb0ssuSDF2cYXSg2iztliJ4B9WdsuB6J952qCPKmnVq4DyW5motImXHDC1cBT/1UezrJVsKw5zjg==",
      "dependencies": {
        "http-parser-js": ">=0.5.1",
        "safe-buffer": ">=5.1.0",
        "websocket-extensions": ">=0.1.1"
      },
      "engines": {
        "node": ">=0.8.0"
      }
    },
    "node_modules/websocket-extensions": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/websocket-extensions/-/websocket-extensions-0.1.4.tgz",
      "integrity": "sha512-OqedPIGOfsDlo31UNwYbCFMSaO9m9G/0faIHj5/dZFDMFqPTcx6UwqyOy3COEaEOg/9VsGIpdqn62W5KhoKSpg==",
      "engines": {
        "node": ">=0.8.0"
      }
    },
    "node_modules/wrap-ansi": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-7.0.0.tgz",
      "integrity": "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==",
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/y18n": {
      "version": "5.0.8",
      "resolved": "https://registry.npmjs.org/y18n/-/y18n-5.0.8.tgz",
      "integrity": "sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA==",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/yallist": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-5.0.0.tgz",
      "integrity": "sha512-YgvUTfwqyc7UXVMrB+SImsVYSmTS8X/tSrtdNZMImM+n7+QTriRXyXim0mBrTXNeqzVF0KWGgHPeiyViFFrNDw==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/yargs": {
      "version": "17.7.2",
      "resolved": "https://registry.npmjs.org/yargs/-/yargs-17.7.2.tgz",
      "integrity": "sha512-7dSzzRQ++CKnNI/krKnYRV7JKKPUXMEh61soaHKg9mrWEhzFWhFnxPxGl+69cD1Ou63C13NUPCnmIcrvqCuM6w==",
      "dependencies": {
        "cliui": "^8.0.1",
        "escalade": "^3.1.1",
        "get-caller-file": "^2.0.5",
        "require-directory": "^2.1.1",
        "string-width": "^4.2.3",
        "y18n": "^5.0.5",
        "yargs-parser": "^21.1.1"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/yargs-parser": {
      "version": "21.1.1",
      "resolved": "https://registry.npmjs.org/yargs-parser/-/yargs-parser-21.1.1.tgz",
      "integrity": "sha512-tVpsJW7DdjecAiFpbIB1e3qxIQsE6NoPc5/eTdrbbIC4h0LVsWhnoa3g+m2HclBIujHzsxZ4VJVA+GUuc2/LBw==",
      "engines": {
        "node": ">=12"
      }
    }
  }
}


// -------------------------
// File: frontend\package.json
// -------------------------

{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "firebase": "^12.0.0",
    "next": "15.4.2",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-icons": "^5.5.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "typescript": "^5"
  },
  "main": "index.js",
  "directories": {
    "lib": "lib"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": ""
}


// -------------------------
// File: frontend\postcss.config.mjs
// -------------------------

const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;


// -------------------------
// File: frontend\public\file.svg
// -------------------------

<svg fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z" clip-rule="evenodd" fill="#666" fill-rule="evenodd"/></svg>

// -------------------------
// File: frontend\public\globe.svg
// -------------------------

<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g clip-path="url(#a)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1" fill="#666"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>

// -------------------------
// File: frontend\public\next.svg
// -------------------------

<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 394 80"><path fill="#000" d="M262 0h68.5v12.7h-27.2v66.6h-13.6V12.7H262V0ZM149 0v12.7H94v20.4h44.3v12.6H94v21h55v12.6H80.5V0h68.7zm34.3 0h-17.8l63.8 79.4h17.9l-32-39.7 32-39.6h-17.9l-23 28.6-23-28.6zm18.3 56.7-9-11-27.1 33.7h17.8l18.3-22.7z"/><path fill="#000" d="M81 79.3 17 0H0v79.3h13.6V17l50.2 62.3H81Zm252.6-.4c-1 0-1.8-.4-2.5-1s-1.1-1.6-1.1-2.6.3-1.8 1-2.5 1.6-1 2.6-1 1.8.3 2.5 1a3.4 3.4 0 0 1 .6 4.3 3.7 3.7 0 0 1-3 1.8zm23.2-33.5h6v23.3c0 2.1-.4 4-1.3 5.5a9.1 9.1 0 0 1-3.8 3.5c-1.6.8-3.5 1.3-5.7 1.3-2 0-3.7-.4-5.3-1s-2.8-1.8-3.7-3.2c-.9-1.3-1.4-3-1.4-5h6c.1.8.3 1.6.7 2.2s1 1.2 1.6 1.5c.7.4 1.5.5 2.4.5 1 0 1.8-.2 2.4-.6a4 4 0 0 0 1.6-1.8c.3-.8.5-1.8.5-3V45.5zm30.9 9.1a4.4 4.4 0 0 0-2-3.3 7.5 7.5 0 0 0-4.3-1.1c-1.3 0-2.4.2-3.3.5-.9.4-1.6 1-2 1.6a3.5 3.5 0 0 0-.3 4c.3.5.7.9 1.3 1.2l1.8 1 2 .5 3.2.8c1.3.3 2.5.7 3.7 1.2a13 13 0 0 1 3.2 1.8 8.1 8.1 0 0 1 3 6.5c0 2-.5 3.7-1.5 5.1a10 10 0 0 1-4.4 3.5c-1.8.8-4.1 1.2-6.8 1.2-2.6 0-4.9-.4-6.8-1.2-2-.8-3.4-2-4.5-3.5a10 10 0 0 1-1.7-5.6h6a5 5 0 0 0 3.5 4.6c1 .4 2.2.6 3.4.6 1.3 0 2.5-.2 3.5-.6 1-.4 1.8-1 2.4-1.7a4 4 0 0 0 .8-2.4c0-.9-.2-1.6-.7-2.2a11 11 0 0 0-2.1-1.4l-3.2-1-3.8-1c-2.8-.7-5-1.7-6.6-3.2a7.2 7.2 0 0 1-2.4-5.7 8 8 0 0 1 1.7-5 10 10 0 0 1 4.3-3.5c2-.8 4-1.2 6.4-1.2 2.3 0 4.4.4 6.2 1.2 1.8.8 3.2 2 4.3 3.4 1 1.4 1.5 3 1.5 5h-5.8z"/></svg>

// -------------------------
// File: frontend\public\vercel.svg
// -------------------------

<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1155 1000"><path d="m577.3 0 577.4 1000H0z" fill="#fff"/></svg>

// -------------------------
// File: frontend\public\window.svg
// -------------------------

<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.5 2.5h13v10a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM0 1h16v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5zm3.75 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7 4.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m1.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5" fill="#666"/></svg>

// -------------------------
// File: frontend\tsconfig.json
// -------------------------

{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "app/page.jsx"],
  "exclude": ["node_modules"]
}


// -------------------------
// File: listFIles.js
// -------------------------

const fs = require("fs");
const path = require("path");

let output = "";

function listDirectory(dirPath, indent = "") {
  const items = fs.readdirSync(dirPath);

  items.forEach((item) => {
    if (item === "node_modules") return;

    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      output += `${indent}📁 ${item}\n`;
      listDirectory(fullPath, indent + "  ");
    } else {
      output += `${indent}📄 ${item}\n`;
    }
  });
}

const targetPath = process.argv[2] || __dirname;
console.log(`Generating structure of: ${targetPath}`);
listDirectory(targetPath);

// Write to structure.txt
const outputPath = path.join(__dirname, "structure.txt");
fs.writeFileSync(outputPath, output, "utf-8");
console.log(`✅ Folder structure saved to: ${outputPath}`);


// -------------------------
// File: mergeCode.js
// -------------------------

const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'all_code_dump.js');
const baseDir = __dirname;

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (path.basename(fullPath) !== 'node_modules') {
        walk(fullPath, callback);
      }
    } else {
      callback(fullPath);
    }
  });
}

function mergeFiles() {
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

  walk(baseDir, (filePath) => {
    const relativePath = path.relative(baseDir, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    const label = `\n\n// -------------------------\n// File: ${relativePath}\n// -------------------------\n\n`;
    fs.appendFileSync(outputFile, label + content, 'utf8');
  });

  console.log(`✅ All files (excluding node_modules) merged into ${outputFile}`);
}

mergeFiles();


// -------------------------
// File: package.json
// -------------------------

{
  "name": "bookmygrad",
  "version": "1.0.0",
  "description": "This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}


// -------------------------
// File: README.md
// -------------------------

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


// -------------------------
// File: structure.txt
// -------------------------

📁 .git
  📄 config
  📄 description
  📄 HEAD
  📁 hooks
    📄 applypatch-msg.sample
    📄 commit-msg.sample
    📄 fsmonitor-watchman.sample
    📄 post-update.sample
    📄 pre-applypatch.sample
    📄 pre-commit.sample
    📄 pre-merge-commit.sample
    📄 pre-push.sample
    📄 pre-rebase.sample
    📄 pre-receive.sample
    📄 prepare-commit-msg.sample
    📄 push-to-checkout.sample
    📄 sendemail-validate.sample
    📄 update.sample
  📄 index
  📁 info
    📄 exclude
  📁 logs
    📄 HEAD
    📁 refs
      📁 heads
        📄 main
      📁 remotes
        📁 origin
          📄 HEAD
  📁 objects
    📁 info
    📁 pack
      📄 pack-1278ab3f7501dcdd69a85a2da4943990d813cb3c.idx
      📄 pack-1278ab3f7501dcdd69a85a2da4943990d813cb3c.pack
      📄 pack-1278ab3f7501dcdd69a85a2da4943990d813cb3c.rev
  📄 packed-refs
  📁 refs
    📁 heads
      📄 main
    📁 remotes
      📁 origin
        📄 HEAD
    📁 tags
📁 backend
  📄 main.py
  📄 serviceAccountKey.json
📁 frontend
  📄 .gitignore
  📁 .next
    📄 app-build-manifest.json
    📄 build-manifest.json
    📁 cache
      📄 .rscinfo
    📄 fallback-build-manifest.json
    📄 package.json
    📄 prerender-manifest.json
    📄 routes-manifest.json
    📁 server
      📄 app-paths-manifest.json
      📄 interception-route-rewrite-manifest.js
      📄 middleware-build-manifest.js
      📄 middleware-manifest.json
      📄 next-font-manifest.js
      📄 next-font-manifest.json
      📄 pages-manifest.json
      📄 server-reference-manifest.js
      📄 server-reference-manifest.json
    📁 static
      📁 development
        📄 _buildManifest.js
        📄 _clientMiddlewareManifest.json
        📄 _ssgManifest.js
    📁 types
  📁 app
    📁 client
      📄 page.jsx
    📁 clientId
      📁 client
        📄 page.jsx
    📁 discover
      📄 page.jsx
    📄 favicon.ico
    📄 globals.css
    📄 layout.tsx
    📄 page.jsx
    📁 [id]
      📁 profile
        📄 page.jsx
  📁 component
    📄 page.jsx
  📁 lib
    📄 firebaseConfig.js
  📄 next-env.d.ts
  📄 next.config.ts
  📄 package-lock.json
  📄 package.json
  📄 postcss.config.mjs
  📁 public
    📄 file.svg
    📄 globe.svg
    📄 next.svg
    📄 vercel.svg
    📄 window.svg
  📄 tsconfig.json
📄 listFIles.js
📄 mergeCode.js
📄 package.json
📄 README.md
